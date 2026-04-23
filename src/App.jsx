import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import GenericPage from './pages/GenericPage';
import SpaceLandingPage from './pages/SpaceLandingPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<GenericPage title="EVENTS" color="#004ffa" />} />
        <Route path="/services" element={<GenericPage title="SERVICES" color="#6222d8" />} />
        <Route path="/community" element={<GenericPage title="COMMUNITY" color="#ff5bb8" />} />
        <Route path="/shop" element={<GenericPage title="SHOP" color="#ff0000" />} />
        <Route path="/about" element={<GenericPage title="ABOUT" color="#ff9300" />} />
        <Route path="/blog" element={<GenericPage title="BLOG" color="#ffde00" />} />
        <Route path="/contact" element={<GenericPage title="CONTACT" color="#90e937" />} />
        <Route path="/prsm" element={<GenericPage title="PRSM" color="#000000" />} />
        <Route path="*" element={<SpaceLandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
