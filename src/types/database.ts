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
      /**
       * One row per ingested source, publicly readable — the only place that knows WHEN a
       * source's own publisher last produced what we hold.
       *
       * The sheet reads exactly one column of it, `source_as_of` for source `idfm`, to date
       * the rail layer. Same discipline as `compass_vintages` for BDCom: a date typed into a
       * front-end file would be an unmeasured claim about data that file never reads.
       */
      ingestion_run: {
        Row: {
          source: string;
          label: string;
          cadence: string;
          cadence_note: string | null;
          source_as_of: string | null;
          last_success_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
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
      /**
       * Freshness per dataset — `ingested_at` is when we last loaded, `source_as_of` is how
       * current the data itself is, and rendering the first as the second tells a reader that
       * a 2023 survey is from this morning. The browser reads `source_as_of` only.
       */
      compass_source_freshness: {
        Args: Record<string, never>;
        Returns: {
          source: string;
          label: string;
          cadence: string;
          cadence_note: string | null;
          source_as_of: string | null;
          ingested_at: string | null;
          row_count: number | null;
          run_by: string | null;
          run_ref: string | null;
          age_days: number | null;
        }[];
      };
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
      /**
       * The bare points feeding `NeighbourhoodContext.premises` — w6-fiche-corpus (#157).
       *
       * No score and no label: Postgres does the spatial selection, `src/core` does the
       * arithmetic. The same function the MCP server has called since 15 August, so the two
       * surfaces read one corpus rather than two.
       */
      compass_scoring_context_within: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
          p_vintage_year?: number;
        };
        Returns: {
          lat: number | null;
          lng: number | null;
          is_vacant: boolean | null;
          /**
           * How many the radius holds, BEFORE PostgREST's `db-max-rows` cap. Repeated on
           * every row: it is a window count, not a per-row value — and it is the only thing
           * that tells a caller its array is a floor rather than a total. Ignoring it is
           * `DIAGNOSTIC.md` §51.
           */
          total_matched: number | null;
          /** One row, no coordinates: the vintage may not be served to this caller. */
          withheld: boolean;
          /** One row, no coordinates: the point is in none of the 80 quartiers. */
          out_of_corpus: boolean;
        }[];
      };
      /** Licence, survey date and scope per BDCom vintage. The only place that knows them. */
      compass_vintages: {
        Args: Record<string, never>;
        Returns: {
          vintage_year: number;
          vintage_scope: string;
          licence: string;
          licence_note: string | null;
          as_of: string;
          source_url: string | null;
          record_count: number | null;
          ingested_at: string | null;
        }[];
      };
      /**
       * What a premise around here became between two vintages — `PLAN.md` §6.1.
       *
       * Withheld in full from an anonymous caller, and structurally rather than incidentally:
       * a transition derives from two vintages and only 2023 is redistributable, so every
       * possible pair contains a vintage whose licence nobody has read. The answer is then ONE
       * marked row carrying the reason, never an empty result.
       */
      compass_activity_transitions: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
          p_from_vintage?: number;
          p_to_vintage?: number;
        };
        Returns: {
          from_niv18: number | null;
          from_label: string | null;
          to_niv18: number | null;
          to_label: string | null;
          premises: number | null;
          is_same_trade: boolean | null;
          withheld: boolean;
          licence: string | null;
          evidence: string | null;
        }[];
      };
      /**
       * The nearest IDFM rail stop's full hourly validation profile — `w2-idfm` (#19), read by
       * the sheet since `w6-amenites-corpus`.
       *
       * **What the sheet reads, and what it deliberately does not.** `distance_m` and
       * `station_name` are the whole of the `stations` layer: metres to the nearest stop.
       * `pct_validations` is the share of that one station's own day falling in an hour
       * bucket — a SHAPE, never a volume, because the dataset publishes no absolute count
       * (`20260907000002`, and measured 15 September 2026: 24 JOHV buckets summing to 99.99 %
       * at Oberkampf). No axis can be counted from it.
       *
       * Zero rows means no Paris stop with a profile sits inside the radius — a reading, not
       * a failure. It carries no `withheld` column: both source datasets are fully open.
       */
      compass_station_profile: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_m?: number;
        };
        Returns: {
          station_id: number;
          station_name: string;
          distance_m: number;
          cat_jour: string;
          hour_bucket: string;
          pct_validations: number;
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
