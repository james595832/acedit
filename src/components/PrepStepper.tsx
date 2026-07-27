type PrepStep = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  current: boolean;
  optional?: boolean;
};

type PrepStepperProps = {
  steps: PrepStep[];
};

/** HubSpot / Toggl-style prep path: numbered nodes, connector, clear current step. */
export function PrepStepper({steps}: PrepStepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.current),
  );
  const current = steps[currentIndex] ?? steps[0];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <nav className="aced-stepper" aria-label="Prep steps">
      <div className="aced-stepper__summary">
        <p className="aced-stepper__phase">
          Step {currentIndex + 1} of {steps.length}
          {current?.optional ? ' · optional' : ''}
        </p>
        <p className="aced-stepper__now">{current?.hint}</p>
        <p className="aced-stepper__count">
          {doneCount === 0
            ? 'Nothing complete yet'
            : `${doneCount} of ${steps.length} complete`}
        </p>
      </div>

      <ol className="aced-stepper__list">
        {steps.map((step, index) => {
          const state = step.done
            ? 'done'
            : step.current
              ? 'current'
              : 'todo';
          const connectorDone =
            index < steps.length - 1 &&
            (steps[index]?.done ||
              steps[index + 1]?.done ||
              steps[index + 1]?.current);

          return (
            <li
              key={step.id}
              className={`aced-stepper__item aced-stepper__item--${state}`}
            >
              <div className="aced-stepper__node">
                <span className="aced-stepper__mark" aria-hidden="true">
                  {step.done ? '✓' : index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className={`aced-stepper__connector${connectorDone ? ' aced-stepper__connector--done' : ''}`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="aced-stepper__copy">
                <span className="aced-stepper__label">
                  {step.label}
                  {step.optional ? (
                    <span className="aced-stepper__optional">Optional</span>
                  ) : null}
                </span>
                <span className="aced-stepper__state">
                  {step.done
                    ? 'Done'
                    : step.current
                      ? 'You are here'
                      : step.optional
                        ? 'Optional'
                        : steps.slice(0, index).some((s) => !s.optional && !s.done)
                          ? 'Up next'
                          : 'Ready'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
