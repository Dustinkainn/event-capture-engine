import { CountSourceType, type CountCategory, type CountItem } from "@prisma/client";
import { formatStatus } from "@/lib/format";

type CategoryWithItems = CountCategory & {
  items: CountItem[];
};

type CountCategoryFormProps = {
  action: (formData: FormData) => void;
  category?: CategoryWithItems;
  submitLabel: string;
};

const sourceTypes: CountSourceType[] = ["answer", "attendee", "payment", "check_in", "custom"];

export function CountCategoryForm({ action, category, submitLabel }: CountCategoryFormProps) {
  const itemText = category?.items
    .sort((first, second) => first.displayOrder - second.displayOrder)
    .map((item) => item.label)
    .join("\n") ?? "";

  return (
    <form action={action} className="editorForm compactForm">
      <section className="formSection">
        <div>
          <label htmlFor={category ? `name-${category.id}` : "name"}>Category name</label>
          <input id={category ? `name-${category.id}` : "name"} name="name" required defaultValue={category?.name ?? ""} />
        </div>
        <div>
          <label htmlFor={category ? `displayOrder-${category.id}` : "displayOrder"}>Display order</label>
          <input id={category ? `displayOrder-${category.id}` : "displayOrder"} name="displayOrder" type="number" min="0" defaultValue={category?.displayOrder ?? 0} />
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor={category ? `sourceType-${category.id}` : "sourceType"}>Source</label>
          <select id={category ? `sourceType-${category.id}` : "sourceType"} name="sourceType" defaultValue={category?.sourceType ?? "answer"}>
            {sourceTypes.map((type) => (
              <option key={type} value={type}>{formatStatus(type)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor={category ? `items-${category.id}` : "items"}>Count items</label>
          <textarea id={category ? `items-${category.id}` : "items"} name="items" rows={5} defaultValue={itemText} placeholder="One item per line" />
        </div>
      </section>

      <div className="formActions">
        <button className="primaryButton" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
