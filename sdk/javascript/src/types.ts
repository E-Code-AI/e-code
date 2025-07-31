export interface Project {
    id: string;
    name: string;
    slug: string;
    description?: string;
    language: string;
    template: string;
    visibility: 'public' | 'private';
    ownerId: number;
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    views: number;
    forks: number;
}

export interface CreateProjectOptions {
    name: string;
    template?: string;
    description?: string;
    visibility?: 'public' | 'private';
}

export interface File {
    id: number;
    projectId: number;
    name: string;
    path: string;
    content: string;
    isFolder: boolean;
    parentId?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Deployment {
    id: number;
    projectId: number;
    status: 'pending' | 'building' | 'running' | 'failed';
    url?: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeploymentOptions {
    strategy?: 'static' | 'autoscale' | 'reserved-vm';
    region?: string;
    environment?: Record<string, string>;
}

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AICompletionOptions {
    code: string;
    language: string;
    maxTokens?: number;
    temperature?: number;
}

export interface Secret {
    key: string;
    value?: string; // Value is not returned in list operations
    createdAt: Date;
    updatedAt: Date;
}

export interface Package {
    name: string;
    version: string;
    type: 'dependency' | 'devDependency';
}

export interface WebhookEvent {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    active: boolean;
    createdAt: Date;
}

export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp?: Date;
}

export interface RealtimeMessage {
    type: string;
    data: any;
    timestamp: Date;
}