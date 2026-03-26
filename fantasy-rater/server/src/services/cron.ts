import cron from 'node-cron';
import db from '../db.js';
import * as sleeper from './platforms/sleeper.js';
import { scoreTeam } from './rater.js';
import { sendInjuryAlert, sendWeeklyDigest } from './email.js';
import { sendPushNotification } from './push.js';
import { clerk } from '../middleware/requireAuth.js';
import type { RaterPlayer } from './rater.js';

const INJURY_ALERT_STATUSES = new Set(['out', 'ir', 'pup', 'doubtful', 'dtd']);

const POSITION_BASE: Record<string, number> = {
  QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20,
};
function rankToValue(rank: number | null | undefined, position: string): number {
  if (rank && rank > 0) return Math.round(Math.max(5, 100 / (1 + rank / 30)));
  return POSITION_BASE[position?.toUpperCase()] ?? 25;
}

async function checkInjuryAlerts() {
  try {
    const allPlayers = await sleeper.getAllPlayers();
    // Check rosters for all sports — MLB injury data comes from ESPN player search cache
    const rosters = db.prepare('SELECT * FROM saved_rosters').all() as Array<{
      clerk_user_id: string;
      platform: string;
      league_id: string;
      roster_id: string;
      player_ids: string;
    }>;

    for (const roster of rosters) {
      const playerIds: string[] = JSON.parse(roster.player_ids);
      const prefs = db.prepare('SELECT * FROM user_prefs WHERE clerk_user_id = ?').get(roster.clerk_user_id) as Record<string, unknown> | undefined;

      for (const playerId of playerIds) {
        const player = allPlayers[playerId];
        if (!player) continue;

        const injuryStatus = player.injury_status?.toLowerCase();
        if (!injuryStatus || !INJURY_ALERT_STATUSES.has(injuryStatus)) continue;

        // Check if we already sent this alert
        const alreadySent = db.prepare(`
          SELECT 1 FROM injury_alerts_sent
          WHERE clerk_user_id = ? AND player_id = ? AND injury_status = ?
        `).get(roster.clerk_user_id, playerId, injuryStatus);

        if (alreadySent) continue;

        // Mark as sent
        try {
          db.prepare(`
            INSERT OR IGNORE INTO injury_alerts_sent (clerk_user_id, player_id, injury_status)
            VALUES (?, ?, ?)
          `).run(roster.clerk_user_id, playerId, injuryStatus);
        } catch {
          continue;
        }

        // Send push notification
        if (prefs?.push_injury_alerts) {
          const subs = db.prepare('SELECT * FROM push_subscriptions WHERE clerk_user_id = ?').all(roster.clerk_user_id) as Array<{
            endpoint: string;
            p256dh: string;
            auth: string;
          }>;

          for (const sub of subs) {
            await sendPushNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              `🏥 Injury Alert: ${player.full_name}`,
              `${player.full_name} is ${player.injury_status} — check waiver wire`,
              '/waiver'
            ).catch(err => {
              // If push subscription is expired/invalid, remove it
              if (err?.statusCode === 410) {
                db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
              }
            });
          }
        }

        // Send email notification
        if (prefs?.email_injury_alerts && prefs?.email) {
          await sendInjuryAlert({
            to: prefs.email as string,
            playerName: player.full_name,
            injuryStatus: player.injury_status ?? 'Unknown',
            position: player.position,
            team: player.team ?? 'FA',
          }).catch(err => console.error('[cron] Email send error:', err));
        }
      }
    }
  } catch (err) {
    console.error('[cron] checkInjuryAlerts error:', err);
  }
}

async function sendWeeklyDigests() {
  try {
    const users = db.prepare(`
      SELECT up.*, sl.sport, sl.league_id, sl.roster_id, sl.platform, sl.scoring_format
      FROM user_prefs up
      JOIN saved_leagues sl ON sl.clerk_user_id = up.clerk_user_id AND sl.is_primary = 1
      WHERE up.email_weekly_digest = 1 AND up.email IS NOT NULL
    `).all() as Array<{
      clerk_user_id: string;
      email: string;
      sport: string;
      league_id: string;
      roster_id: string;
      platform: string;
      scoring_format: string;
    }>;

    for (const user of users) {
      try {
        if (!['nfl', 'mlb'].includes(user.sport)) continue; // NFL and MLB supported

        const [rosters, allPlayers] = await Promise.all([
          sleeper.getRosters(user.league_id),
          sleeper.getAllPlayers(),
        ]);

        const targetRoster = user.roster_id
          ? rosters.find(r => r.roster_id === Number(user.roster_id))
          : rosters[0];

        if (!targetRoster) continue;

        const rosterPlayers: RaterPlayer[] = targetRoster.players
          .map(id => {
            const p = allPlayers[id];
            if (!p) return null;
            return {
              name: p.full_name,
              position: p.position,
              team: p.team ?? 'FA',
              injuryStatus: p.injury_status,
              rank: rankToValue(p.search_rank, p.position),
            } as RaterPlayer;
          })
          .filter(Boolean) as RaterPlayer[];

        if (!rosterPlayers.length) continue;

        const teamScore = scoreTeam(rosterPlayers);
        const record = `${targetRoster.settings.wins}-${targetRoster.settings.losses}`;

        // Build top actions list
        const weakPositions = Object.entries(teamScore.positionBreakdown)
          .filter(([, v]) => v.score < 70)
          .sort((a, b) => a[1].score - b[1].score)
          .slice(0, 3)
          .map(([pos, v]) => `Improve your ${pos} depth (currently ${v.grade})`);

        const injuredPlayers = rosterPlayers
          .filter(p => p.injuryStatus && INJURY_ALERT_STATUSES.has(p.injuryStatus.toLowerCase()))
          .map(p => `Check on ${p.name} (${p.injuryStatus}) — waiver pickup may be needed`);

        const topActions = [...injuredPlayers, ...weakPositions].slice(0, 3);
        if (!topActions.length) topActions.push('Your roster looks solid — monitor injury reports heading into the week');

        await sendWeeklyDigest({
          to: user.email,
          teamGrade: teamScore.grade,
          teamScore: teamScore.score,
          sport: user.sport,
          topActions,
          record,
        });
      } catch (err) {
        console.error(`[cron] Weekly digest failed for user ${user.clerk_user_id}:`, err);
      }
    }
  } catch (err) {
    console.error('[cron] sendWeeklyDigests error:', err);
  }
}

export function startCronJobs() {
  // Every 15 minutes — check for injury status changes
  cron.schedule('*/15 * * * *', () => {
    checkInjuryAlerts().catch(console.error);
  });

  // Every Monday at 9am — send weekly digest emails
  cron.schedule('0 9 * * 1', () => {
    sendWeeklyDigests().catch(console.error);
  });

  console.log('[cron] Jobs started: injury alerts (15min), weekly digest (Mon 9am)');
}

// Export for manual testing
export { checkInjuryAlerts, sendWeeklyDigests };
