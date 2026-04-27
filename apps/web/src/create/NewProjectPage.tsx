import { NewProjectWizard } from './NewProjectWizard';
import './create-flow.css';

export function NewProjectPage() {
  return <NewProjectWizard onHandoffToAi={(draftName) => {
    const params = new URLSearchParams({ draft: draftName });
    window.location.assign(`/new/ai?${params}`);
  }} />;
}
