import * as vscode from "vscode"

import { BudgetData } from "../models/budget.model"

export class DataService {
  get currentData(): BudgetData {
    return this.budgetData
  }
  get isDataLoaded(): boolean {
    return this.hasDataLoaded
  }
  get onDidUpdateData(): vscode.Event<BudgetData> {
    return this.onDataUpdated.event
  }

  private budgetData: BudgetData = {
    daily: {
      percentage: 0,
      total: 0,
      used: 0
    },
    monthly: {
      percentage: 0,
      total: 0,
      used: 0
    },
    opus: {
      enabled: false
    }
  }

  private hasDataLoaded: boolean = false

  private onDataUpdated: vscode.EventEmitter<BudgetData>

  constructor() {
    this.onDataUpdated = new vscode.EventEmitter<BudgetData>()
  }

  dispose(): void {
    this.onDataUpdated.dispose()
  }

  getPercentageIcon(percentage: number): string {
    if (percentage >= 90) {
      return "$(error)"
    }
    if (percentage >= 75) {
      return "$(warning)"
    }
    if (percentage >= 50) {
      return "$(info)"
    }
    return "$(check)"
  }

  updateData(data: BudgetData): void {
    this.budgetData = data
    this.hasDataLoaded = true
    this.onDataUpdated.fire(data)
  }
}
