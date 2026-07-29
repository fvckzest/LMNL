import { Navigate, useParams } from 'react-router-dom';
import MockupPage from '../components/mockup/MockupPage';
import { getMockupProject } from '../lib/mockups';

export default function Mockup() {
  const { slug } = useParams();
  const project = getMockupProject(slug);

  if (!project) {
    return <Navigate to="/mockup/firecreek" replace />;
  }

  return <MockupPage project={project} />;
}
