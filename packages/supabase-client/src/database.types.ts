// ============================================
// Supabase Database Types
// Auto-generated types should replace this file
// Run: supabase gen types typescript --local > database.types.ts
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          kdf_iterations: number;
          encrypted_symmetric_key: string | null;
          auth_hash: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deletion_scheduled_at: string | null;
          restore_token: string | null;
          restore_token_expires_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          kdf_iterations?: number;
          encrypted_symmetric_key?: string | null;
          auth_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deletion_scheduled_at?: string | null;
          restore_token?: string | null;
          restore_token_expires_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          kdf_iterations?: number;
          encrypted_symmetric_key?: string | null;
          auth_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deletion_scheduled_at?: string | null;
          restore_token?: string | null;
          restore_token_expires_at?: string | null;
        };
      };
      vault_items: {
        Row: {
          id: string;
          user_id: string;
          folder_id: string | null;
          organization_id: string | null;
          encrypted_data: string;
          type: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          folder_id?: string | null;
          organization_id?: string | null;
          encrypted_data: string;
          type: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          folder_id?: string | null;
          organization_id?: string | null;
          encrypted_data?: string;
          type?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      org_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
          status?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}







