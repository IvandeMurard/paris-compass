export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications: boolean;
          push_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications?: boolean;
          push_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_properties: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          property_data: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id: string;
          property_data: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string;
          property_data?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_properties_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notification_settings: {
        Row: {
          id: string;
          user_id: string;
          saved_search_id: string | null;
          notification_frequency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          saved_search_id?: string | null;
          notification_frequency: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          saved_search_id?: string | null;
          notification_frequency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_settings_saved_search_id_fkey";
            columns: ["saved_search_id"];
            isOneToOne: false;
            referencedRelation: "saved_searches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    /**
     * The `compass_*` RPCs the browser actually calls.
     *
     * Only the ones that have a consumer are declared. A signature written here that
     * nothing calls would be an unverified claim about the remote schema — the same
     * failure `Measured<T>` exists to prevent, one level up. The argument names are the
     * SQL parameter names: PostgREST matches on them, so a typo is a runtime 404, not a
     * type error.
     */
    Functions: {
      compass_address_timeline: {
        Args: { p_location_id: number };
        Returns: {
          occurred_on: string;
          granularity: string;
          source: string;
          source_ref: string | null;
          source_url: string | null;
          source_licence: string | null;
          kind: string;
          /**
           * Three values, three different statements, and flattening any two of them
           * together is the defect this whole sheet exists to avoid:
           * `true` surveyed, `false` NOT surveyed that year, `null` withheld.
           */
          observed: boolean | null;
          withheld: boolean;
          activity_code: string | null;
          label: string | null;
          detail: string | null;
          amount_eur: number | null;
          evidence: string | null;
          confidence: Database['public']['Enums']['compass_confidence'];
          confidence_rule: string | null;
          confidence_reason: string | null;
        }[];
      };
      compass_premises_within: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
          p_vintage_year?: number;
          p_limit?: number;
        };
        Returns: {
          location_id: number | null;
          ordre: number | null;
          lat: number | null;
          lng: number | null;
          distance_m: number | null;
          address: string | null;
          arrondissement: number | null;
          quartier_name: string | null;
          street_segment_id: number | null;
          activity_code: string | null;
          activity_label: string | null;
          activity_niv18: number | null;
          activity_group: string | null;
          is_vacant: boolean | null;
          size_band: number | null;
          size_label: string | null;
          situation_label: string | null;
          sign_name: string | null;
          /**
           * A binary, mapped constraint (PLAN.md §2.4), never a score: on a protected
           * linear a ground-floor premise cannot change use. Informational only, no
           * regulatory value. `plu_protected` is the OR of the three components.
           */
          plu_protected: boolean | null;
          plu_commerce_artisanat: boolean | null;
          plu_commerce_proximite: boolean | null;
          plu_commerce_culturel: boolean | null;
          /**
           * A fait d'exposition (PLAN.md §5.1), never a prediction of impact on
           * turnover: true when a disruptive worksite sits within 40 m of the
           * premise. Dated by `chantier_date_debut`/`chantier_date_fin`, sourced by
           * the Ville de Paris — never collapsed into a score.
           */
          chantier_exposed: boolean | null;
          chantier_distance_m: number | null;
          chantier_objet: string | null;
          chantier_description: string | null;
          chantier_date_debut: string | null;
          chantier_date_fin: string | null;
          chantier_statut_label: string | null;
          /**
           * 'oui' only when exactly one premise sits at the matched street+number — a
           * shared address (69% of premises share one, PLAN.md §3.3) comes back
           * 'inconnu' rather than guessing which co-located premise holds the
           * authorisation. Never proof a terrace is installed today.
           */
          terrasse_status: 'oui' | 'non' | 'inconnu' | null;
          terrasse_permanente: boolean | null;
          terrasse_estivale: boolean | null;
          terrasse_etalage: boolean | null;
          /** Count before `p_limit`, so the interface can say "22 of 125". */
          total_matched: number | null;
          /**
           * A single row with `withheld = true` and every other column null is a
           * vintage the caller may not receive. Zero rows means the radius is
           * genuinely empty. Never conflate the two.
           */
          withheld: boolean;
        }[];
      };
    };
    Enums: {
      compass_confidence: 'etabli' | 'corrobore' | 'probable' | 'indetermine';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
