/**
 * Supabase Database type definitions for AuraLink.
 * These provide type safety across all database operations.
 */

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    username: string
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    username: string
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    username?: string
                    avatar_url?: string | null
                }
                Relationships: []
            }
            connections: {
                Row: {
                    id: string
                    user1_id: string
                    user2_id: string
                    status: 'pending' | 'accepted'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user1_id: string
                    user2_id: string
                    status?: 'pending' | 'accepted'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user1_id?: string
                    user2_id?: string
                    status?: 'pending' | 'accepted'
                }
                Relationships: []
            }
            messages: {
                Row: {
                    id: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    type: 'text' | 'file'
                    file_url: string | null
                    telegram_file_id: string | null
                    telegram_msg_id: number | null
                    timestamp: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    sender_id: string
                    receiver_id: string
                    content: string
                    type?: 'text' | 'file'
                    file_url?: string | null
                    telegram_file_id?: string | null
                    telegram_msg_id?: number | null
                    timestamp?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    sender_id?: string
                    receiver_id?: string
                    content?: string
                    type?: 'text' | 'file'
                    file_url?: string | null
                    telegram_file_id?: string | null
                    telegram_msg_id?: number | null
                }
                Relationships: []
            }
            notes: {
                Row: {
                    id: string
                    connection_id: string | null
                    user_id: string
                    content: string
                    title: string | null
                    last_edited_by: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    connection_id?: string | null
                    user_id: string
                    content: string
                    title?: string | null
                    last_edited_by?: string | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    connection_id?: string | null
                    user_id?: string
                    content?: string
                    title?: string | null
                    last_edited_by?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            timetable: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    time: string | null
                    day: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    time?: string | null
                    day?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string | null
                    time?: string | null
                    day?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            timetables: {
                Row: {
                    id: string
                    connection_id: string | null
                    user_id: string
                    title: string
                    status: 'todo' | 'done'
                    created_at: string
                }
                Insert: {
                    id?: string
                    connection_id?: string | null
                    user_id: string
                    title: string
                    status?: 'todo' | 'done'
                    created_at?: string
                }
                Update: {
                    id?: string
                    connection_id?: string | null
                    user_id?: string
                    title?: string
                    status?: 'todo' | 'done'
                }
                Relationships: []
            }
            vault: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    content: string
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    content: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    content?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            vault_items: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    content: string
                    type: 'file' | 'folder'
                    file_url: string | null
                    telegram_file_id: string | null
                    telegram_msg_id: number | null
                    file_size: number | null
                    folder_id: string | null
                    is_chat_file: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    content: string
                    type?: 'file' | 'folder'
                    file_url?: string | null
                    telegram_file_id?: string | null
                    telegram_msg_id?: number | null
                    file_size?: number | null
                    folder_id?: string | null
                    is_chat_file?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    content?: string
                    type?: 'file' | 'folder'
                    file_url?: string | null
                    folder_id?: string | null
                }
                Relationships: []
            }
            push_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    endpoint: string
                    auth: string
                    p256dh: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    endpoint: string
                    auth: string
                    p256dh: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    endpoint?: string
                    auth?: string
                    p256dh?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row']
export type Connection = Database['public']['Tables']['connections']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type Timetable = Database['public']['Tables']['timetables']['Row']
export type VaultItem = Database['public']['Tables']['vault_items']['Row']
