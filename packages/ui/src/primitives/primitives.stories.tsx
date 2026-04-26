import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Banner,
  Button,
  Card,
  Combobox,
  DataTable,
  EmptyState,
  FileDropzone,
  Form,
  IconButton,
  Input,
  Progress,
  Select,
  Skeleton,
  Spinner,
  Textarea,
  Tree,
} from './index.js';
import { Icon } from '../icons/index.js';

function PrimitiveGallery() {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } });
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 960, color: 'hsl(var(--ecode-fg))' }}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <IconButton label="Settings" variant="outline"><Icon name="Settings" /></IconButton>
        </div>
      </Card>
      <Card style={{ padding: 16, display: 'grid', gap: 12 }}>
        <Input placeholder="Input" />
        <Textarea placeholder="Textarea" />
        <Select items={[{ value: 'react', label: 'React' }, { value: 'next', label: 'Next.js' }]} placeholder="Framework" />
        <Combobox options={[{ value: 'us', label: 'us-central1' }, { value: 'eu', label: 'europe-west1' }]} />
        <Form form={form} onSubmit={() => undefined}>
          <Input {...form.register('name')} placeholder="React Hook Form field" />
        </Form>
      </Card>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge>Badge</Badge>
        <Banner>Informational banner</Banner>
        <Spinner />
      </div>
      <Progress value={64} />
      <Skeleton style={{ height: 32 }} />
      <Tree items={[{ id: 'src', label: 'src', children: [{ id: 'app', label: 'App.tsx' }] }]} />
      <DataTable
        data={[{ name: 'Next.js', status: 'Ready' }, { name: 'FastAPI', status: 'Ready' }]}
        columns={[
          { id: 'name', header: 'Template', accessor: (row) => row.name, sortValue: (row) => row.name },
          { id: 'status', header: 'Status', accessor: (row) => row.status },
        ]}
      />
      <FileDropzone onFiles={() => undefined} />
      <EmptyState title="No deployments" description="Deployments appear here once Cloud Build starts." />
    </div>
  );
}

const meta: Meta<typeof PrimitiveGallery> = {
  title: 'Primitives/Gallery',
  component: PrimitiveGallery,
};

export default meta;
export const Default: StoryObj<typeof PrimitiveGallery> = {};
