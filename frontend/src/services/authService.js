import axios from "axios";

const API_URL = "http://localhost:8080/api/auth";

const authService = {
  login: async ({ email, password }) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  register: async ({ fullName, email, password, currency = "BHD" }) => {
    const response = await axios.post(`${API_URL}/register`, {
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

  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem("user"));
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  createSetupIntent: () => {
    const token = localStorage.getItem("token");
    return axios.post(
      "http://localhost:8080/api/payments/setup-intent",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  saveCard: (data) => {
    const token = localStorage.getItem("token");
    return axios.post("http://localhost:8080/api/users/bank-card", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export default authService;
