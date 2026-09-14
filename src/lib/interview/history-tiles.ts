import {getJobDescription} from '@/lib/store';
import {
  buildSeriesHistoryTiles,
  type SeriesHistoryTile,
} from '@/lib/interview/rounds';
import type {InterviewSession} from '@/lib/types';

export async function historyTilesForSessions(
  sessions: InterviewSession[],
  userId: string | null,
): Promise<SeriesHistoryTile[]> {
  const jdIds = [
    ...new Set(
      sessions
        .map((session) => session.job_description_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const jdById = new Map<
    string,
    {role_title: string | null; company_name: string | null}
  >();

  if (userId && jdIds.length) {
    const rows = await Promise.all(
      jdIds.map(async (id) => {
        try {
          const jd = await getJobDescription(id, userId);
          return jd
            ? ([
                id,
                {
                  role_title: jd.role_title,
                  company_name: jd.company_name,
                },
              ] as const)
            : null;
        } catch {
          return null;
        }
      }),
    );
    for (const row of rows) {
      if (row) jdById.set(row[0], row[1]);
    }
  }

  return buildSeriesHistoryTiles(
    sessions.map((session) => {
      const jd = session.job_description_id
        ? jdById.get(session.job_description_id)
        : null;
      return {
        id: session.id,
        series_id: session.series_id,
        stage_number: session.stage_number,
        overall_score: session.overall_score,
        created_at: session.created_at,
        role_title: jd?.role_title ?? null,
        company_name: jd?.company_name ?? null,
      };
    }),
  );
}
