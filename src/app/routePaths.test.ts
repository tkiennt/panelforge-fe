import { describe, expect, it } from 'vitest';
import {
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
} from './routePaths';

describe('canonical Producer and Editor routes', () => {
  it('keeps the selected chapter across the production flow', () => {
    expect(
      buildProductionWorkspaceUrl('workspace 1', 'series/1', {
        chapterId: 'chapter?1',
        tab: 'crew',
      }),
    ).toBe(
      '/workspaces/workspace%201/series/series%2F1/workspace?chapterId=chapter%3F1&tab=crew',
    );

    expect(buildChapterManagementUrl('workspace 1', 'series/1', 'chapter?1')).toBe(
      '/workspaces/workspace%201/series/series%2F1/chapters?chapterId=chapter%3F1',
    );

    expect(buildScriptReviewUrl('workspace 1', 'series/1', 'chapter?1')).toBe(
      '/workspaces/workspace%201/series/series%2F1/chapters/chapter%3F1/script/review',
    );
    expect(buildChapterReaderUrl('workspace 1', 'series/1', 'chapter?1')).toBe(
      '/workspaces/workspace%201/series/series%2F1/chapters/chapter%3F1/reader',
    );
    expect(buildSeriesExportUrl('workspace 1', 'series/1', 'chapter?1')).toBe(
      '/workspaces/workspace%201/series/series%2F1/export?chapterId=chapter%3F1',
    );
  });
});
