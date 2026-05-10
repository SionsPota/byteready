import { Routes, Route } from "react-router";
import Dashboard from "./pages/Dashboard";
import Interviews from "./pages/Interviews";
import InterviewDetail from "./pages/InterviewDetail";
import InterviewForm from "./pages/InterviewForm";
import Companies from "./pages/Companies";
import Tags from "./pages/Tags";
import Crawler from "./pages/Crawler";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/interviews" element={<Interviews />} />
      <Route path="/interviews/new" element={<InterviewForm />} />
      <Route path="/interviews/:id" element={<InterviewDetail />} />
      <Route path="/interviews/:id/edit" element={<InterviewForm />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/tags" element={<Tags />} />
      <Route path="/crawler" element={<Crawler />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
