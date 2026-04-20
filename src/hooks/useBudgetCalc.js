import { useMemo } from 'react'

export function useBudgetCalc(expenses = [], totalBudget = 0) {
  return useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const remaining  = totalBudget - totalSpent
    const burnPct    = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
      return acc
    }, {})

    const byDate = expenses.reduce((acc, e) => {
      acc[e.paid_at] = (acc[e.paid_at] || 0) + Number(e.amount)
      return acc
    }, {})

    let running = 0
    const timeSeriesData = Object.keys(byDate).sort().map(date => {
      running += byDate[date]
      return { date, daily: byDate[date], cumulative: running }
    })

    const categoryData = Object.entries(byCategory).map(([name, value]) => ({
      name, value: Number(value.toFixed(2)),
    }))

    return {
      totalSpent:  Number(totalSpent.toFixed(2)),
      remaining:   Number(remaining.toFixed(2)),
      burnPct:     Number(burnPct.toFixed(1)),
      byCategory,
      timeSeriesData,
      categoryData,
      isOverBudget: totalSpent > totalBudget,
    }
  }, [expenses, totalBudget])
}
