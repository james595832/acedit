import type {WhiteboardDebrief} from '@/lib/whiteboard/chat';

type WhiteboardDebriefViewProps = {
  debrief: WhiteboardDebrief;
  sketchUrl?: string | null;
  sketchAlt?: string;
};

export function WhiteboardDebriefView({
  debrief,
  sketchUrl,
  sketchAlt = 'Whiteboard sketch',
}: WhiteboardDebriefViewProps) {
  return (
    <div className="aced-wb__debrief-body">
      <p className="aced-wb__debrief-score">
        Against the ask · {debrief.score}/100
      </p>
      <h2>Assessment</h2>
      <p className="aced-wb__against-ask">{debrief.againstAsk}</p>
      <p>{debrief.summary}</p>

      {debrief.deliverables.length > 0 ? (
        <div className="aced-wb__deliverables">
          <h3>Deliverables vs your work</h3>
          <ul className="aced-wb__deliverable-list">
            {debrief.deliverables.map((item) => (
              <li
                key={item.item}
                className={`aced-wb__deliverable aced-wb__deliverable--${item.status}`}
              >
                <span className="aced-wb__deliverable-status">
                  {item.status}
                </span>
                <div>
                  <p className="aced-wb__deliverable-item">{item.item}</p>
                  <p className="aced-wb__deliverable-note">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {debrief.sketchAssessment ? (
        <div className="aced-wb__sketch-assess">
          <h3>Sketch vs ask</h3>
          <p>{debrief.sketchAssessment}</p>
        </div>
      ) : null}

      {sketchUrl ? (
        <figure className="aced-wb__sketch-review">
          <figcaption>Your saved sketch</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sketchUrl} alt={sketchAlt} />
        </figure>
      ) : null}

      {debrief.strengths.length > 0 ? (
        <>
          <h3>Strengths</h3>
          <ul>
            {debrief.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      {debrief.improvements.length > 0 ? (
        <>
          <h3>Improve next time</h3>
          <ul>
            {debrief.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
