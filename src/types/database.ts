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
                    username?: string
                    avatar_url?: string | null
                }
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
                    user1_id: string
                    user2_id: string
                    status?: 'pending' | 'accepted'
                }
                Update: {
                    status?: 'pending' | 'accepted'
                }
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
                    sender_id: string
                    receiver_id: string
                    content: string
                    type?: 'text' | 'file'
                    file_url?: string | null
                    telegram_file_id?: string | null
                    telegram_msg_id?: number | null
                }
                Update: {
                    content?: string
                    type?: 'text' | 'file'
                    file_url?: string | null
                }
            }
            notes: {
                Row: {
                    id: string
                    connection_id: string | null
                    user_id: string
                    content: string
                    last_edited_by: string | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    connection_id?: string | null
                    user_id: string
                    content: string
                    last_edited_by?: string | null
                }
                Update: {
                    content?: string
                    last_edited_by?: string | null
                    updated_at?: string | null
                }
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
                    connection_id?: string | null
                    user_id: string
                    title: string
                    status?: 'todo' | 'done'
                }
                Update: {
                    title?: string
                    status?: 'todo' | 'done'
                }
            }
            vault_items: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    content: string
                    type: 'file' | 'folder'
                    telegram_file_id: string | null
                    telegram_msg_id: number | null
                    file_size: number | null
                    folder_id: string | null
                    is_chat_file: boolean
                    created_at: string
                }
                Insert: {
                    user_id: string
                    name: string
                    content: string
                    type?: 'file' | 'folder'
                    telegram_file_id?: string | null
                    telegram_msg_id?: number | null
                    file_size?: number | null
                    folder_id?: string | null
                    is_chat_file?: boolean
                }
                Update: {
                    name?: string
                    content?: string
                    type?: 'file' | 'folder'
                    folder_id?: string | null
                }
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
                    user_id: string
                    endpoint: string
                    auth: string
                    p256dh: string
                }
                Update: {
                    endpoint?: string
                    auth?: string
                    p256dh?: string
                }
            }
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
