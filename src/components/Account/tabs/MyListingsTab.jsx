import { useNavigate } from "react-router-dom";
import MyListingsComponent from "./MyListingsComponent";
export default function MyListingsTab() {
  const navigate = useNavigate();
  return <MyListingsComponent onCreateListing={() => navigate("/create")} />;
}
