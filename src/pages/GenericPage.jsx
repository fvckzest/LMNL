import ContentPageShell from '../components/ContentPageShell';

export default function GenericPage({ title, color, children }) {
  return (
    <ContentPageShell title={title} color={color}>
      {children}
    </ContentPageShell>
  );
}
