const API_URL = "http://localhost:3000/api";

const api = {
    // Helper function: Har request ke liye taaza headers taiyar karne ke liye
    getHeaders() {
        const token = localStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json"
        };
        // Agar token milta hai toh Authorization header add karo
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    },

    // Global Response Handler: Status codes (jaise 401) handle karne ke liye
    async handleResponse(res) {
        const data = await res.json();
        // Agar token expire ho gaya ya invalid hai (401), toh logout karwao
        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "index.html";
            return;
        }
        return data;
    },

    async get(path) {
        const res = await fetch(API_URL + path, { 
            headers: this.getHeaders() 
        });
        return this.handleResponse(res);
    },

    async post(path, data) {
        const res = await fetch(API_URL + path, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(res);
    },

    async patch(path, data) {
        const res = await fetch(API_URL + path, {
            method: "PATCH",
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(res);
    },

    async del(path) {
        const res = await fetch(API_URL + path, {
            method: "DELETE",
            headers: this.getHeaders(),
        });
        return this.handleResponse(res);
    }
};