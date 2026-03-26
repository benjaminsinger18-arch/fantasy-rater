import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'FantasyRater <alerts@fantasyrater.app>';

export async function sendInjuryAlert(params: {
  to: string;
  playerName: string;
  injuryStatus: string;
  position: string;
  team: string;
}): Promise<void> {
  const { to, playerName, injuryStatus, position, team } = params;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;">
        <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#c4b5fd;">🏥 Injury Alert</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">${playerName}</h1>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:15px;">
          <strong style="color:#f87171;">${injuryStatus.toUpperCase()}</strong> —
          ${position}, ${team}
        </p>
        <p style="margin:0;font-size:13px;color:#94a3b8;">
          Log in to FantasyRater to get an instant waiver wire recommendation and trade value update for this player.
        </p>
        <a href="${process.env.CLIENT_URL ?? 'http://localhost:5173'}/waiver"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
          View Waiver Recommendations →
        </a>
      </div>
    </div>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🏥 Injury Alert: ${playerName} is ${injuryStatus}`,
    html,
  });
}

export async function sendWeeklyDigest(params: {
  to: string;
  teamGrade: string;
  teamScore: number;
  sport: string;
  topActions: string[];
  record?: string;
}): Promise<void> {
  const { to, teamGrade, teamScore, sport, topActions, record } = params;

  const gradeColor = teamGrade.startsWith('A') ? '#34d399' : teamGrade.startsWith('B') ? '#60a5fa' : teamGrade.startsWith('C') ? '#fbbf24' : '#f87171';

  const actionItems = topActions
    .map(a => `<li style="margin-bottom:8px;font-size:14px;">${a}</li>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:20px 24px;">
        <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#c4b5fd;">📋 Weekly Digest</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">${sport.toUpperCase()} Team Update</h1>
        ${record ? `<p style="margin:6px 0 0;font-size:13px;color:#c4b5fd;">Record: ${record}</p>` : ''}
      </div>
      <div style="padding:20px 24px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <div style="width:60px;height:60px;border-radius:12px;background:#1e293b;display:flex;align-items:center;justify-content:center;border:2px solid ${gradeColor};font-size:24px;font-weight:900;color:${gradeColor};">${teamGrade}</div>
          <div>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Team Score</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#fff;">${teamScore}/100</p>
          </div>
        </div>
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">This Week's Top Actions</p>
        <ul style="margin:0;padding-left:20px;color:#e2e8f0;">
          ${actionItems}
        </ul>
        <a href="${process.env.CLIENT_URL ?? 'http://localhost:5173'}"
           style="display:inline-block;margin-top:20px;padding:10px 20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
          Open FantasyRater →
        </a>
      </div>
    </div>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `📋 Your ${sport.toUpperCase()} Team This Week — Grade: ${teamGrade}`,
    html,
  });
}
