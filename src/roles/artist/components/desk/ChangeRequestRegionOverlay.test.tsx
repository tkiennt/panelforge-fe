import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PanelDto } from '@/types/pipeline';
import type { PageChangeRequestMark } from '../../utils/changeRequestLocation';
import { ChangeRequestRegionOverlay } from './ChangeRequestRegionOverlay';

describe('ChangeRequestRegionOverlay', () => {
  it('renders nothing for empty marks', () => {
    const { container } = render(
      <ChangeRequestRegionOverlay marks={[]} panels={[]} pageWidth={1200} pageHeight={1800} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('change-request-region-overlay')).not.toBeInTheDocument();
  });

  it('a mark with box {x:0.1,y:0.2,w:0.3,h:0.4} renders change-request-region-<id> with style left 10%, top 20%, width 30%, height 40%, and badge text 1', () => {
    const mark: PageChangeRequestMark = {
      id: 'cr-1',
      pageId: 'page-1',
      panelId: null,
      box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      stageId: 'stage-1',
      description: 'Fix hand shape',
      onOlderVersion: false,
    };

    render(
      <ChangeRequestRegionOverlay marks={[mark]} panels={[]} pageWidth={1200} pageHeight={1800} />,
    );

    const region = screen.getByTestId('change-request-region-cr-1');
    expect(region).toBeInTheDocument();
    expect(region).toHaveStyle({
      left: '10%',
      top: '20%',
      width: '30%',
      height: '40%',
    });
    expect(region).toHaveTextContent('1');
  });

  it("a mark with no box but a panelId uses that panel's boundingBox", () => {
    const panel: PanelDto = {
      id: 'panel-1',
      pageId: 'page-1',
      panelNumber: 1,
      readingOrder: 1,
      boundingBox: JSON.stringify({
        normalized: { x: 0.15, y: 0.25, w: 0.35, h: 0.45 },
      }),
    } as PanelDto;

    const mark: PageChangeRequestMark = {
      id: 'cr-panel',
      pageId: 'page-1',
      panelId: 'panel-1',
      box: null,
      stageId: 'stage-1',
      description: 'Panel fix',
      onOlderVersion: false,
    };

    render(
      <ChangeRequestRegionOverlay
        marks={[mark]}
        panels={[panel]}
        pageWidth={1200}
        pageHeight={1800}
      />,
    );

    const region = screen.getByTestId('change-request-region-cr-panel');
    expect(region).toBeInTheDocument();
    expect(region).toHaveStyle({
      left: '15%',
      top: '25%',
      width: '35%',
      height: '45%',
    });
  });

  it('focusedId sets data-focused="true" on that mark', () => {
    const mark1: PageChangeRequestMark = {
      id: 'cr-focus',
      pageId: 'page-1',
      panelId: null,
      box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      stageId: 'stage-1',
      description: 'Focused mark',
      onOlderVersion: false,
    };
    const mark2: PageChangeRequestMark = {
      id: 'cr-other',
      pageId: 'page-1',
      panelId: null,
      box: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
      stageId: 'stage-1',
      description: 'Other mark',
      onOlderVersion: false,
    };

    render(
      <ChangeRequestRegionOverlay
        marks={[mark1, mark2]}
        panels={[]}
        pageWidth={1200}
        pageHeight={1800}
        focusedId='cr-focus'
      />,
    );

    const focusedRegion = screen.getByTestId('change-request-region-cr-focus');
    const otherRegion = screen.getByTestId('change-request-region-cr-other');

    expect(focusedRegion).toHaveAttribute('data-focused', 'true');
    expect(otherRegion).not.toHaveAttribute('data-focused');
  });
});
