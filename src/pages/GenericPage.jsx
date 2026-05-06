import ContentPageShell from '../components/ContentPageShell';

export default function GenericPage({ title, color, children, ...rest }) {
  return (
    <ContentPageShell title={title} color={color} {...rest}>
      {children}
    </ContentPageShell>
  );
}
