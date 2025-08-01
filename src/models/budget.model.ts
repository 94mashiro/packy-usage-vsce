export interface ApiResponse {
  [key: string]: unknown
  daily_budget_usd?: number
  daily_spent_usd?: number
  monthly_budget_usd?: number
  monthly_spent_usd?: number
}

export interface BudgetData {
  daily: {
    percentage: number
    total: number
    used: number
  }
  monthly: {
    percentage: number
    total: number
    used: number
  }
}
