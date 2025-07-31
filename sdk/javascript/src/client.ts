import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'eventemitter3';

export interface ClientConfig {
    apiKey: string;
    baseUrl: string;
}

export class ECodeClient extends EventEmitter {
    private axios: AxiosInstance;
    private apiKey: string;

    constructor(config: ClientConfig) {
        super();
        this.apiKey = config.apiKey;
        
        this.axios = axios.create({
            baseURL: config.baseUrl + '/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add auth interceptor
        this.axios.interceptors.request.use((config) => {
            if (this.apiKey) {
                config.headers.Authorization = `Bearer ${this.apiKey}`;
            }
            return config;
        });

        // Add response interceptor for error handling
        this.axios.interceptors.response.use(
            response => response,
            error => {
                this.emit('error', error);
                return Promise.reject(error);
            }
        );
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    async get<T = any>(path: string, config?: AxiosRequestConfig) {
        const response = await this.axios.get<T>(path, config);
        return response.data;
    }

    async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig) {
        const response = await this.axios.post<T>(path, data, config);
        return response.data;
    }

    async put<T = any>(path: string, data?: any, config?: AxiosRequestConfig) {
        const response = await this.axios.put<T>(path, data, config);
        return response.data;
    }

    async patch<T = any>(path: string, data?: any, config?: AxiosRequestConfig) {
        const response = await this.axios.patch<T>(path, data, config);
        return response.data;
    }

    async delete<T = any>(path: string, config?: AxiosRequestConfig) {
        const response = await this.axios.delete<T>(path, config);
        return response.data;
    }
}