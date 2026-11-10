/** Creating a project, or editing its details, in a dialog. */
import { catalog } from '@campuskit/project-catalog';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import { SelectField, TextareaField, TextField } from '../../components/ui/Field.tsx';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  LIMITS,
  STATUSES,
  STATUS_LABELS,
  validateDetails,
  type ProjectDetails,
} from '../../lib/workspace.ts';

const FIELDS = ['title', 'description'] as const;

/** "React, TypeScript" → ["React", "TypeScript"]. */
const splitList = (text: string) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function ProjectForm({
  initial,
  title,
  submitLabel,
  onSubmit,
  onClose,
}: {
  initial: ProjectDetails;
  title: string;
  submitLabel: string;
  onSubmit: (details: ProjectDetails) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    title: initial.title,
    description: initial.description,
    category: initial.category,
    status: initial.status,
    tags: initial.tags.join(', '),
    stack: initial.stack.join(', '),
    templateId: initial.templateId ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectDetails, string>>>({});
  const formId = useId();

  const set = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const details: ProjectDetails = {
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      tags: splitList(values.tags),
      stack: splitList(values.stack),
      templateId: values.templateId || null,
    };
    const found = validateDetails(details);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = FIELDS.find((name) => found[name]);
      const control = first ? form.elements.namedItem(first) : null;
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    onSubmit(details);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <TextField
          name="title"
          label="Title"
          maxLength={LIMITS.title + 20}
          autoComplete="off"
          value={values.title}
          error={errors.title}
          onChange={(event) => set('title', event.target.value)}
        />
        <TextareaField
          name="description"
          label="Description"
          optional
          font="sans"
          rows={3}
          className="min-h-24"
          description="What it does and who it is for, in a sentence or two."
          value={values.description}
          error={errors.description}
          onChange={(event) => set('description', event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            value={values.category}
            onChange={(event) => set('category', event.target.value)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={values.status}
            onChange={(event) => set('status', event.target.value)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextField
          label="Technology stack"
          optional
          autoComplete="off"
          description="Separated by commas, for example React, TypeScript, SQLite."
          value={values.stack}
          onChange={(event) => set('stack', event.target.value)}
        />
        <TextField
          label="Tags"
          optional
          autoComplete="off"
          description="Separated by commas, for example final year, team of 3."
          value={values.tags}
          onChange={(event) => set('tags', event.target.value)}
        />
        <SelectField
          label="Started from a CampusKit template"
          description="Links the template’s learning studio, viva questions and documents."
          value={values.templateId}
          onChange={(event) => set('templateId', event.target.value)}
        >
          <option value="">No template</option>
          {catalog.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </SelectField>
      </form>
    </Dialog>
  );
}
