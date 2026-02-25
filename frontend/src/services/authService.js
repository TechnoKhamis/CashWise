import axios from "axios";


const API_URL = import.meta.env.VITE_API_URL;

const authService = {
  login: async ({ email, password }) => {
    const response = await axios.post(`${API_URL}/login`, { email, password }); // ✅ Fixed
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  register: async ({ fullName, email, password, currency = "BHD" }) => {
    const response = await axios.post(`${API_URL}/register`, { // ✅ Fixed
      fullName,
      email,
      password,
      currency,
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => JSON.parse(localStorage.getItem("user")),

  getToken: () => localStorage.getItem("token"),

  createSetupIntent: () => {
    const token = localStorage.getItem("token");
    return axios.post(
      "http://localhost:8080/api/payment/setup-intent",  // ✅ Remove the 's'
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  saveCard: (data) => {
    const token = localStorage.getItem("token");
  return axios.post("http://localhost:8080/api/payment/save-card", data, {  // ✅ Remove the 's'
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export default authService;
