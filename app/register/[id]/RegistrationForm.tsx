"use client";

import { useState } from "react";

type RegistrationQuestionOption = {
  id: string;
  label: string;
};

type RegistrationQuestion = {
  id: string;
  helpText: string | null;
  isRequired: boolean;
  label: string;
  options: RegistrationQuestionOption[];
  questionType: string;
  scope: string;
};

type RegistrationFormProps = {
  action: (formData: FormData) => void;
  questions: RegistrationQuestion[];
};

const maxAttendees = 8;

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

function formatScope(scope: string) {
  return scope.replace(/_/g, " ");
}

export function RegistrationForm({ action, questions }: RegistrationFormProps) {
  const [attendees, setAttendees] = useState([0]);
  const registrationQuestions = questions.filter((question) => question.scope === "registration");
  const attendeeQuestions = questions.filter((question) => question.scope === "attendee");

  function addAttendee() {
    setAttendees((current) => {
      if (current.length >= maxAttendees) {
        return current;
      }

      return [...current, Math.max(...current) + 1];
    });
  }

  function removeAttendee(attendeeKey: number) {
    setAttendees((current) => current.filter((key) => key !== attendeeKey));
  }

  function renderQuestion(question: RegistrationQuestion, fieldName: string) {
    const isChoice = question.questionType === "dropdown" || question.questionType === "multiple_choice";
    const isCheckbox = question.questionType === "checkbox" || question.questionType === "waiver";

    return (
      <div className="publicQuestion" key={fieldName}>
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
        <small>{formatScope(question.scope)}</small>
      </div>
    );
  }

  return (
    <form action={action} className="publicCard registrationForm">
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
          <div className="stepHeader">
            <div>
              <h2>Attendees</h2>
              <p>Add each person who should be checked in for this registration.</p>
            </div>
            <button className="secondaryButton" type="button" onClick={addAttendee} disabled={attendees.length >= maxAttendees}>
              Add Attendee
            </button>
          </div>
          <input name="attendeeKeys" type="hidden" value={attendees.join(",")} readOnly />
          <div className="attendeeGroup">
            {attendees.map((attendeeKey, index) => (
              <article className="attendeeEntry" key={attendeeKey}>
                <div className="attendeeEntryHeader">
                  <h3>Attendee {index + 1}</h3>
                  {attendees.length > 1 ? (
                    <button className="textButton" type="button" onClick={() => removeAttendee(attendeeKey)}>
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="formSection">
                  <div>
                    <label htmlFor={`attendeeFirstName-${attendeeKey}`}>First name</label>
                    <input id={`attendeeFirstName-${attendeeKey}`} name={`attendeeFirstName-${attendeeKey}`} required />
                  </div>
                  <div>
                    <label htmlFor={`attendeeLastName-${attendeeKey}`}>Last name</label>
                    <input id={`attendeeLastName-${attendeeKey}`} name={`attendeeLastName-${attendeeKey}`} />
                  </div>
                  <div>
                    <label htmlFor={`attendeeEmail-${attendeeKey}`}>Email</label>
                    <input id={`attendeeEmail-${attendeeKey}`} name={`attendeeEmail-${attendeeKey}`} type="email" />
                  </div>
                  <div>
                    <label htmlFor={`attendeePhone-${attendeeKey}`}>Phone</label>
                    <input id={`attendeePhone-${attendeeKey}`} name={`attendeePhone-${attendeeKey}`} type="tel" />
                  </div>
                  <div>
                    <label htmlFor={`ageGroup-${attendeeKey}`}>Age group</label>
                    <select id={`ageGroup-${attendeeKey}`} name={`ageGroup-${attendeeKey}`} defaultValue="adult">
                      <option value="adult">Adult</option>
                      <option value="student">Student</option>
                      <option value="child">Child</option>
                      <option value="unknown">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                {attendeeQuestions.length > 0 ? (
                  <div className="publicQuestions attendeeQuestions">
                    {attendeeQuestions.map((question) => renderQuestion(question, `attendeeQuestion-${question.id}-${attendeeKey}`))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {registrationQuestions.length > 0 ? (
        <section className="formStep">
          <span className="stepBadge">3</span>
          <div>
            <h2>Registration Details</h2>
            <div className="publicQuestions">
              {registrationQuestions.map((question) => renderQuestion(question, `question-${question.id}`))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="formActions">
        <a className="secondaryButton" href="/events">Back to events</a>
        <button className="primaryButton" type="submit">Complete Registration</button>
      </div>
    </form>
  );
}
