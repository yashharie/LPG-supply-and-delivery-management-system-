import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";

const PublicLayout = () => {
  return (
    <>
      <Navbar />

      {/* PAGE CONTENT */}
      <Outlet />

      <Footer />
    </>
  );
};

export default PublicLayout;