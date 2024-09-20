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
      apis: {
        Row: {
          closed_at: string | null
          contractId: number
          id: number
          poolId: number
          url: string
          username: string
        }
        Insert: {
          closed_at?: string | null
          contractId: number
          id?: number
          poolId: number
          url: string
          username: string
        }
        Update: {
          closed_at?: string | null
          contractId?: number
          id?: number
          poolId?: number
          url?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_poolId_fkey"
            columns: ["poolId"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apis_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      asics: {
        Row: {
          created_at: string
          hashrateTHs: number
          id: number
          manufacturer: string
          model: string
          powerW: number
        }
        Insert: {
          created_at?: string
          hashrateTHs?: number
          id?: number
          manufacturer: string
          model: string
          powerW?: number
        }
        Update: {
          created_at?: string
          hashrateTHs?: number
          id?: number
          manufacturer?: string
          model?: string
          powerW?: number
        }
        Relationships: []
      }
      containers: {
        Row: {
          asicId: number
          cost: number
          created_at: string
          end: string | null
          id: number
          locationId: number
          siteId: number
          slug: string
          start: string | null
          units: number
        }
        Insert: {
          asicId: number
          cost: number
          created_at?: string
          end?: string | null
          id?: number
          locationId: number
          siteId: number
          slug: string
          start?: string | null
          units?: number
        }
        Update: {
          asicId?: number
          cost?: number
          created_at?: string
          end?: string | null
          id?: number
          locationId?: number
          siteId?: number
          slug?: string
          start?: string | null
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "containers_asicId_fkey"
            columns: ["asicId"]
            isOneToOne: false
            referencedRelation: "asics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "containers_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "containers_siteId_fkey"
            columns: ["siteId"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          csmPowerTax: number
          csmProfitSharing: number
          csmTaxRate: number
          electricityContractDuration: number
          electricityContractRenewable: boolean
          electricityPrice: number
          id: number
          operator: string
          opPowerTax: number
          opProfitSharing: number
          opTaxRate: number
          pool: string
          poolTaxRate: number
          slug: string
        }
        Insert: {
          created_at?: string
          csmPowerTax?: number
          csmProfitSharing?: number
          csmTaxRate?: number
          electricityContractDuration?: number
          electricityContractRenewable?: boolean
          electricityPrice?: number
          id?: number
          operator: string
          opPowerTax?: number
          opProfitSharing?: number
          opTaxRate?: number
          pool: string
          poolTaxRate?: number
          slug: string
        }
        Update: {
          created_at?: string
          csmPowerTax?: number
          csmProfitSharing?: number
          csmTaxRate?: number
          electricityContractDuration?: number
          electricityContractRenewable?: boolean
          electricityPrice?: number
          id?: number
          operator?: string
          opPowerTax?: number
          opProfitSharing?: number
          opTaxRate?: number
          pool?: string
          poolTaxRate?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_operator_fkey"
            columns: ["operator"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "contract_pool_fkey"
            columns: ["pool"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["name"]
          },
        ]
      }
      energies: {
        Row: {
          id: number
          type: string
        }
        Insert: {
          id?: number
          type: string
        }
        Update: {
          id?: number
          type?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          id: number
          imageLink: string
          locationId: number
          name: string
          shortName: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          imageLink: string
          locationId: number
          name: string
          shortName: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          imageLink?: string
          locationId?: number
          name?: string
          shortName?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      financialStatements: {
        Row: {
          btc: number
          btcPrice: number
          created_at: string
          end: string
          farmSlug: string
          flow: string
          from: string | null
          id: number
          siteSlug: string
          start: string
          to: string | null
          usd: number
        }
        Insert: {
          btc: number
          btcPrice: number
          created_at?: string
          end: string
          farmSlug: string
          flow: string
          from?: string | null
          id?: number
          siteSlug: string
          start: string
          to?: string | null
          usd: number
        }
        Update: {
          btc?: number
          btcPrice?: number
          created_at?: string
          end?: string
          farmSlug?: string
          flow?: string
          from?: string | null
          id?: number
          siteSlug?: string
          start?: string
          to?: string | null
          usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "financialStatement_at_fkey"
            columns: ["to"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["provider"]
          },
          {
            foreignKeyName: "financialStatement_flow_fkey"
            columns: ["flow"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["cash"]
          },
          {
            foreignKeyName: "financialStatements_farmSlug_fkey"
            columns: ["farmSlug"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "financialStatements_from_fkey"
            columns: ["from"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["provider"]
          },
          {
            foreignKeyName: "financialStatements_siteSlug_fkey"
            columns: ["siteSlug"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["slug"]
          },
        ]
      }
      flows: {
        Row: {
          cash: string
        }
        Insert: {
          cash: string
        }
        Update: {
          cash?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          aera: string
          country: string
          countryCode: string
          id: number
        }
        Insert: {
          aera: string
          country: string
          countryCode: string
          id?: number
        }
        Update: {
          aera?: string
          country?: string
          countryCode?: string
          id?: number
        }
        Relationships: []
      }
      mining: {
        Row: {
          created_at: string
          day: string
          farmSlug: string
          hashrate: number
          id: number
          mined: number
          siteSlug: string
          uptime: number
        }
        Insert: {
          created_at?: string
          day?: string
          farmSlug: string
          hashrate: number
          id?: number
          mined: number
          siteSlug: string
          uptime: number
        }
        Update: {
          created_at?: string
          day?: string
          farmSlug?: string
          hashrate?: number
          id?: number
          mined?: number
          siteSlug?: string
          uptime?: number
        }
        Relationships: [
          {
            foreignKeyName: "mining_farmSlug_fkey"
            columns: ["farmSlug"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "mining_siteSlug_fkey"
            columns: ["siteSlug"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "mining_slug_fkey"
            columns: ["farmSlug"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "mining_slug_fkey1"
            columns: ["farmSlug"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["slug"]
          },
        ]
      }
      operators: {
        Row: {
          id: number
          logo: string
          name: string
          website: string
        }
        Insert: {
          id?: number
          logo: string
          name: string
          website: string
        }
        Update: {
          id?: number
          logo?: string
          name?: string
          website?: string
        }
        Relationships: []
      }
      pools: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      powerPlants: {
        Row: {
          created_at: string
          energies: string[]
          id: number
          locationId: number
          powerMW: number
          slug: string
        }
        Insert: {
          created_at?: string
          energies: string[]
          id?: number
          locationId: number
          powerMW?: number
          slug: string
        }
        Update: {
          created_at?: string
          energies?: string[]
          id?: number
          locationId?: number
          powerMW?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "powerPlant_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          provider: string
        }
        Insert: {
          provider: string
        }
        Update: {
          provider?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          closed_at: string | null
          contractId: number
          created_at: string
          farmId: number
          id: number
          isClosed: boolean
          localisationId: number
          operatorId: number
          powerPlantId: number
          slug: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          contractId: number
          created_at?: string
          farmId: number
          id?: number
          isClosed?: boolean
          localisationId: number
          operatorId: number
          powerPlantId: number
          slug: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          contractId?: number
          created_at?: string
          farmId?: number
          id?: number
          isClosed?: boolean
          localisationId?: number
          operatorId?: number
          powerPlantId?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Site_farmId_fkey"
            columns: ["farmId"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Site_localisationId_fkey"
            columns: ["localisationId"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_contractId_fkey"
            columns: ["contractId"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_operatorId_fkey"
            columns: ["operatorId"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_powerPlantId_fkey"
            columns: ["powerPlantId"]
            isOneToOne: false
            referencedRelation: "powerPlants"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          created_at: string
          crowdFundingFeeRate: number
          csmSaShare: number
          farmId: number
          id: number
          locationId: number
          name: string
          provisionRate: number
          registrationNumber: string
          shareCapital: number
          taxRate: number
          tokenization: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          crowdFundingFeeRate?: number
          csmSaShare?: number
          farmId: number
          id?: number
          locationId: number
          name: string
          provisionRate?: number
          registrationNumber: string
          shareCapital?: number
          taxRate?: number
          tokenization?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          crowdFundingFeeRate?: number
          csmSaShare?: number
          farmId?: number
          id?: number
          locationId?: number
          name?: string
          provisionRate?: number
          registrationNumber?: string
          shareCapital?: number
          taxRate?: number
          tokenization?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "societies_farmId_fkey"
            columns: ["farmId"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_locationId_fkey"
            columns: ["locationId"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          address: string
          created_at: string
          decimals: number
          farmId: number
          gnosisscanUrl: string
          id: number
          initialPrice: number
          name: string
          supply: number
          symbol: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          decimals?: number
          farmId: number
          gnosisscanUrl: string
          id?: number
          initialPrice: number
          name: string
          supply: number
          symbol: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          decimals?: number
          farmId?: number
          gnosisscanUrl?: string
          id?: number
          initialPrice?: number
          name?: string
          supply?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_farmId_fkey"
            columns: ["farmId"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vaults: {
        Row: {
          created_at: string
          farmId: number
          id: number
          xpub: string
        }
        Insert: {
          created_at?: string
          farmId: number
          id?: number
          xpub: string
        }
        Update: {
          created_at?: string
          farmId?: number
          id?: number
          xpub?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_farmId_fkey"
            columns: ["farmId"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
