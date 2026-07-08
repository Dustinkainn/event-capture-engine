import { QuestionScope, QuestionType, type QuestionOption, type RegistrationQuestion } from "@prisma/client";
import { formatStatus } from "@/lib/format";

type QuestionWithOptions = RegistrationQuestion & {
  options: QuestionOption[];
};

type QuestionFormProps = {
  action: (formData: FormData) => void;
  question?: QuestionWithOptions;
  submitLabel: string;
};

const questionTypes: QuestionType[] = [
  "text",
  "email",
  "phone",
  "dropdown",
  "multiple_choice",
  "checkbox",
  "date",
  "long_answer",
  "waiver"
];

const scopes: QuestionScope[] = ["registration", "attendee"];

export function QuestionForm({ action, question, submitLabel }: QuestionFormProps) {
  const optionText = question?.options
    .sort((first, second) => first.displayOrder - second.displayOrder)
    .map((option) => option.label)
    .join("\n") ?? "";

  return (
    <form action={action} className="editorForm compactForm">
      <section className="formSection">
        <div>
          <label htmlFor="label">Question label</label>
          <input id="label" name="label" required defaultValue={question?.label ?? ""} />
        </div>
        <div>
          <label htmlFor="displayOrder">Display order</label>
          <input id="displayOrder" name="displayOrder" type="number" min="0" defaultValue={question?.displayOrder ?? 0} />
        </div>
      </section>

      <section className="formSection">
        <div>
          <label htmlFor="questionType">Answer type</label>
          <select id="questionType" name="questionType" defaultValue={question?.questionType ?? "text"}>
            {questionTypes.map((type) => (
              <option key={type} value={type}>{formatStatus(type)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scope">Applies to</label>
          <select id="scope" name="scope" defaultValue={question?.scope ?? "attendee"}>
            {scopes.map((scope) => (
              <option key={scope} value={scope}>{formatStatus(scope)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor="helpText">Helper text</label>
          <input id="helpText" name="helpText" defaultValue={question?.helpText ?? ""} />
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor="options">Options</label>
          <textarea id="options" name="options" rows={5} defaultValue={optionText} placeholder="One option per line" />
        </div>
      </section>

      <label className="checkRow">
        <input name="isRequired" type="checkbox" defaultChecked={question?.isRequired ?? false} />
        <span>Required question</span>
      </label>

      <div className="formActions">
        <button className="primaryButton" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
