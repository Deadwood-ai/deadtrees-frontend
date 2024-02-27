export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      logs: {
        Row: {
          created_at: string
          file_id: string | null
          id: number
          level: string | null
          message: string | null
          name: string | null
          origin: string | null
          origin_line: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          id?: number
          level?: string | null
          message?: string | null
          name?: string | null
          origin?: string | null
          origin_line?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string | null
          id?: number
          level?: string | null
          message?: string | null
          name?: string | null
          origin?: string | null
          origin_line?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      metadata: {
        Row: {
          aquisition_date: string | null
          email: string | null
          file_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: number
          licence: string | null
          platform: string | null
          status: string | null
        }
        Insert: {
          aquisition_date?: string | null
          email?: string | null
          file_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: number
          licence?: string | null
          platform?: string | null
          status?: string | null
        }
        Update: {
          aquisition_date?: string | null
          email?: string | null
          file_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: number
          licence?: string | null
          platform?: string | null
          status?: string | null
        }
        Relationships: []
      }
      upload_files: {
        Row: {
          aquisition_date: string
          bbox: unknown | null
          compress_time: number | null
          content_type: string
          copy_time: number
          created_at: string
          file_id: string
          file_name: string
          file_size: number
          id: number
          license: Database["public"]["Enums"]["License"]
          platform: Database["public"]["Enums"]["Platform"]
          sha256: string
          status: Database["public"]["Enums"]["Status"]
          target_path: string
          upload_date: string
          user_id: string
          uuid: string
          wms_source: string | null
        }
        Insert: {
          aquisition_date: string
          bbox?: unknown | null
          compress_time?: number | null
          content_type: string
          copy_time: number
          created_at?: string
          file_id: string
          file_name: string
          file_size: number
          id?: number
          license?: Database["public"]["Enums"]["License"]
          platform: Database["public"]["Enums"]["Platform"]
          sha256: string
          status?: Database["public"]["Enums"]["Status"]
          target_path: string
          upload_date: string
          user_id: string
          uuid: string
          wms_source?: string | null
        }
        Update: {
          aquisition_date?: string
          bbox?: unknown | null
          compress_time?: number | null
          content_type?: string
          copy_time?: number
          created_at?: string
          file_id?: string
          file_name?: string
          file_size?: number
          id?: number
          license?: Database["public"]["Enums"]["License"]
          platform?: Database["public"]["Enums"]["Platform"]
          sha256?: string
          status?: Database["public"]["Enums"]["Status"]
          target_path?: string
          upload_date?: string
          user_id?: string
          uuid?: string
          wms_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_upload_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      upload_files_dev: {
        Row: {
          aquisition_date: string
          bbox: unknown | null
          compress_time: number | null
          content_type: string
          copy_time: number
          created_at: string
          file_id: string
          file_name: string
          file_size: number
          id: number
          license: Database["public"]["Enums"]["License"]
          platform: Database["public"]["Enums"]["Platform"]
          sha256: string
          status: Database["public"]["Enums"]["Status"]
          target_path: string
          upload_date: string
          user_id: string
          uuid: string
          wms_source: string | null
        }
        Insert: {
          aquisition_date: string
          bbox?: unknown | null
          compress_time?: number | null
          content_type: string
          copy_time: number
          created_at?: string
          file_id: string
          file_name: string
          file_size: number
          id?: number
          license?: Database["public"]["Enums"]["License"]
          platform: Database["public"]["Enums"]["Platform"]
          sha256: string
          status?: Database["public"]["Enums"]["Status"]
          target_path: string
          upload_date: string
          user_id: string
          uuid: string
          wms_source?: string | null
        }
        Update: {
          aquisition_date?: string
          bbox?: unknown | null
          compress_time?: number | null
          content_type?: string
          copy_time?: number
          created_at?: string
          file_id?: string
          file_name?: string
          file_size?: number
          id?: number
          license?: Database["public"]["Enums"]["License"]
          platform?: Database["public"]["Enums"]["Platform"]
          sha256?: string
          status?: Database["public"]["Enums"]["Status"]
          target_path?: string
          upload_date?: string
          user_id?: string
          uuid?: string
          wms_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_upload_files_dev_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      License: "cc-by" | "cc-by-sa"
      Platform: "drone" | "airborne" | "sattelfite"
      Status:
        | "pending"
        | "processing"
        | "errored"
        | "processed"
        | "audited"
        | "audit_failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
