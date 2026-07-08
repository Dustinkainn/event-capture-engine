import { notFound } from "next/navigation";
import { formatEventDateTime, formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { submitRegistration } from "../actions";

type RegistrationPageProps = {
  params: Promise<{ id: string }>;
};

function inputTypeFor(questionType: string) {
  if (questionType === "email") {
    return "email";
  }

  if (questionType === "phone") {
    return "tel";
  }

  if (questionType === "date") {
    return "date";
  }

  return "text";
}

export default async function RegistrationPage({ params }: RegistrationPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      },
      attendees: true,
      registrations: true
    }
  });

  if (!event || event.status !== "open" || event.visibility !== "public") {
    notFound();
  }

  const register = submitRegistration.bind(null, event.id);
  const remaining = event.capacity ? Math.max(event.capacity - event.attendees.length, 0) : null;

  return (
    <main className="publicShell">
      <section className="publicHero">
        <div>
          <p className="eyebrow">Event Registration</p>
          <h1>{event.name}</h1>
          <p>{formatEventDateTime(event.startsAt)}{event.locationName ? ` | ${event.locationName}` : ""}</p>
        </div>
      </section>

      <section className="publicContent">
        <article className="publicCard introCard">
          <div>
            <p className="eyebrow">Event Details</p>
            <h2>Register for this event</h2>
            <p>{event.description ?? "Complete the registration details below."}</p>
          </div>
          <div className="publicStats">
            <div><strong>{event.attendees.length}</strong><span>registered</span></div>
            <div><strong>{remaining ?? "Open"}</strong><span>{remaining === null ? "capacity" : "spots left"}</span></div>
            <div><strong>{event.isPaid ? "Paid" : "Free"}</strong><span>event</span></div>
          </div>
        </article>

        <form action={register} className="publicCard registrationForm">
          <section className="formStep">
            <span className="stepBadge">1</span>
            <div>
              <h2>Primary Contact</h2>
              <div className="formSection">
                <div>
                  <label htmlFor="primaryFirstName">First name</label>
                  <input id="primaryFirstName" name="primaryFirstName" required />
                </div>
                <div>
                  <label htmlFor="primaryLastName">Last name</label>
                  <input id="primaryLastName" name="primaryLastName" required />
                </div>
                <div>
                  <label htmlFor="primaryEmail">Email</label>
                  <input id="primaryEmail" name="primaryEmail" type="email" />
                </div>
                <div>
                  <label htmlFor="primaryPhone">Phone</label>
                  <input id="primaryPhone" name="primaryPhone" type="tel" />
                </div>
              </div>
            </div>
          </section>

          <section className="formStep">
            <span className="stepBadge">2</span>
            <div>
              <h2>Attendee</h2>
              <div className="formSection">
                <div>
                  <label htmlFor="attendeeFirstName">First name</label>
                  <input id="attendeeFirstName" name="attendeeFirstName" required />
                </div>
                <div>
                  <label htmlFor="attendeeLastName">Last name</label>
                  <input id="attendeeLastName" name="attendeeLastName" />
                </div>
                <div>
                  <label htmlFor="attendeeEmail">Email</label>
                  <input id="attendeeEmail" name="attendeeEmail" type="email" />
                </div>
                <div>
                  <label htmlFor="ageGroup">Age group</label>
                  <select id="ageGroup" name="ageGroup" defaultValue="adult">
                    <option value="adult">Adult</option>
                    <option value="student">Student</option>
                    <option value="child">Child</option>
                    <option value="unknown">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {event.questions.length > 0 ? (
            <section className="formStep">
              <span className="stepBadge">3</span>
              <div>
                <h2>Event Questions</h2>
                <div className="publicQuestions">
                  {event.questions.map((question) => {
                    const fieldName = question.scope === "attendee" ? `attendeeQuestion-${question.id}` : `question-${question.id}`;
                    const isChoice = question.questionType === "dropdown" || question.questionType === "multiple_choice";
                    const isCheckbox = question.questionType === "checkbox" || question.questionType === "waiver";

                    return (
                      <div className="publicQuestion" key={question.id}>
                        <label htmlFor={fieldName}>{question.label}{question.isRequired ? " *" : ""}</label>
                        {question.helpText ? <span>{question.helpText}</span> : null}
                        {isChoice ? (
                          <select id={fieldName} name={fieldName} required={question.isRequired} defaultValue="">
                            <option value="" disabled>Choose an option</option>
                            {question.options.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        ) : isCheckbox ? (
                          <label className="checkRow">
                            <input id={fieldName} name={fieldName} type="checkbox" required={question.isRequired} />
                            <span>{question.questionType === "waiver" ? "I agree" : "Yes"}</span>
                          </label>
                        ) : question.questionType === "long_answer" ? (
                          <textarea id={fieldName} name={fieldName} rows={4} required={question.isRequired} />
                        ) : (
                          <input id={fieldName} name={fieldName} type={inputTypeFor(question.questionType)} required={question.isRequired} />
                        )}
                        <small>{formatStatus(question.scope)}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <div className="formActions">
            <a className="secondaryButton" href="/events">Back to events</a>
            <button className="primaryButton" type="submit">Complete Registration</button>
          </div>
        </form>
      </section>
    </main>
  );
}
