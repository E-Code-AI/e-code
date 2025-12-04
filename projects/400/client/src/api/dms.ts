import axios, { AxiosInstance, AxiosResponse } from "axios";

export interface DMParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isRead?: boolean;
}

export interface DMConversation {
  id: string;
  participants: DMParticipant[];
  lastMessage?: DMMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDMConversations {
  items: DMConversation[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface FetchDMConversationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateDMConversationPayload {
  participantIds: string[];
  initialMessage?: string;
}

export interface CreateDMConversationResponse {
  conversation: DMConversation;
  initialMessage?: DMMessage;
}

export interface FetchDMMessagesParams {
  conversationId: string;
  before?: string;
  after?: string;
  limit?: number;
}

export interface PaginatedDMMessages {
  items: DMMessage[];
  total: number;
  hasNextPage: boolean;
}

export interface SendDMMessagePayload {
  conversationId: string;
  content: string;
}

export interface SendDMMessageResponse {
  message: DMMessage;
}

export interface MarkDMConversationReadPayload {
  conversationId: string;
}

export interface MarkDMConversationReadResponse {
  conversationId: string;
  unreadCount: number;
}

export interface DmsApiClientConfig {
  baseURL?: string;
  axiosInstance?: AxiosInstance;
  getAuthToken?: () => string | null | undefined;
}

class DmsApiClient {
  private axios: AxiosInstance;
  private getAuthToken?: () => string | null | undefined;

  constructor(config: DmsApiClientConfig = {}) {
    this.getAuthToken = config.getAuthToken;

    if (config.axiosInstance) {
      this.axios = config.axiosInstance;
    } else {
      this.axios = axios.create({
        baseURL: config.baseURL || "/api",
        withCredentials: true,
      });

      this.axios.interceptors.request.use((requestConfig) => {
        const token = this.getAuthToken ? this.getAuthToken() : null;
        if (token) {
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers.Authorization = `Bearer undefined`;
        }
        return requestConfig;
      });
    }
  }

  async fetchConversations(
    params: FetchDMConversationsParams = {}
  ): Promise<PaginatedDMConversations> {
    const response: AxiosResponse<PaginatedDMConversations> =
      await this.axios.get("/dms/conversations", {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        },
      });
    return response.data;
  }

  async createConversation(
    payload: CreateDMConversationPayload
  ): Promise<CreateDMConversationResponse> {
    const response: AxiosResponse<CreateDMConversationResponse> =
      await this.axios.post("/dms/conversations", payload);
    return response.data;
  }

  async fetchMessages(
    params: FetchDMMessagesParams
  ): Promise<PaginatedDMMessages> {
    const { conversationId, before, after, limit } = params;
    const response: AxiosResponse<PaginatedDMMessages> = await this.axios.get(
      `/dms/conversations/undefined/messages`,
      {
        params: {
          before,
          after,
          limit,
        },
      }
    );
    return response.data;
  }

  async sendMessage(
    payload: SendDMMessagePayload
  ): Promise<SendDMMessageResponse> {
    const { conversationId, content } = payload;
    const response: AxiosResponse<SendDMMessageResponse> = await this.axios.post(
      `/dms/conversations/undefined/messages`,
      { content }
    );
    return response.data;
  }

  async markConversationRead(
    payload: MarkDMConversationReadPayload
  ): Promise<MarkDMConversationReadResponse> {
    const { conversationId } = payload;
    const response: AxiosResponse<MarkDMConversationReadResponse> =
      await this.axios.post(
        `/dms/conversations/undefined/read`
      );
    return response.data;
  }
}

let defaultClient: DmsApiClient | null = null;

export const getDmsApiClient = (config?: DmsApiClientConfig): DmsApiClient => {
  if (!defaultClient) {
    defaultClient = new DmsApiClient(config);
  }
  return defaultClient;
};

export const fetchDMConversations = (
  params?: FetchDMConversationsParams
): Promise<PaginatedDMConversations> => {
  return getDmsApiClient().fetchConversations(params || {});
};

export const createDMConversation = (
  payload: CreateDMConversationPayload
): Promise<CreateDMConversationResponse> => {
  return getDmsApiClient().createConversation(payload);
};

export const fetchDMMessages = (
  params: FetchDMMessagesParams
): Promise<PaginatedDMMessages> => {
  return getDmsApiClient().fetchMessages(params);
};

export const sendDMMessage = (
  payload: SendDMMessagePayload
): Promise<SendDMMessageResponse> => {
  return getDmsApiClient().sendMessage(payload);
};

export const markDMConversationRead = (
  payload: MarkDMConversationReadPayload
): Promise<MarkDMConversationReadResponse> => {
  return getDmsApiClient().markConversationRead(payload);
};