import { pool, regionLabels } from "@/lib/db/pools";
import { getDropStats } from "@/lib/queries";
import { ok, fail, handleError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The cross-region proof: write a marker through region A, then immediately read
 * it back through region B. With Aurora DSQL's strong consistency the row is
 * there with no replication lag — and the entry totals match from both
 * endpoints. (In local mode A and B share one Postgres, so this trivially
 * passes; the real proof is on a multi-region DSQL cluster.)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("dropId");
    if (!dropId) return fail("bad_request", "dropId required");

    const nonce = `probe-${Date.now()}`;
    const t0 = Date.now();
    const inserted = await pool("A").query(
      `INSERT INTO audit_log (drop_id, action, region, detail_json)
       VALUES ($1, 'consistency_probe', 'A', $2) RETURNING id`,
      [dropId, JSON.stringify({ nonce })],
    );
    const writeMs = Date.now() - t0;
    const markerId = inserted.rows[0].id as string;

    const t1 = Date.now();
    const readBack = await pool("B").query(`SELECT id FROM audit_log WHERE id = $1`, [markerId]);
    const readMs = Date.now() - t1;
    const foundInB = (readBack.rowCount ?? 0) > 0;

    const [statsA, statsB] = await Promise.all([getDropStats(dropId, "A"), getDropStats(dropId, "B")]);

    return ok({
      wroteVia: regionLabels.A,
      readVia: regionLabels.B,
      foundInB,
      writeMs,
      readMs,
      regionA: { label: regionLabels.A, entriesTotal: statsA.entriesTotal },
      regionB: { label: regionLabels.B, entriesTotal: statsB.entriesTotal },
      consistent: foundInB && statsA.entriesTotal === statsB.entriesTotal,
    });
  } catch (e) {
    return handleError(e);
  }
}
