export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area'

export interface ChartDataset {
  label:  string
  data:   number[]
  color?: string
}

export interface ChartElementMeta {
  type:      'chart'
  title:     string
  chartType: ChartType
  labels:    string[]
  datasets:  ChartDataset[]
  height:    number
}

export class Chart {
  private _title:     string
  private _chartType: ChartType = 'line'
  private _labels:    string[] = []
  private _datasets:  ChartDataset[] = []
  private _height     = 300

  protected constructor(title: string) {
    this._title = title
  }

  static make(title: string): Chart {
    return new Chart(title)
  }

  chartType(type: ChartType): this {
    this._chartType = type
    return this
  }

  labels(labels: string[]): this {
    this._labels = labels
    return this
  }

  datasets(datasets: ChartDataset[]): this {
    this._datasets = datasets
    return this
  }

  height(h: number): this {
    this._height = h
    return this
  }

  getType(): 'chart' { return 'chart' }

  toMeta(): ChartElementMeta {
    return {
      type:      'chart',
      title:     this._title,
      chartType: this._chartType,
      labels:    this._labels,
      datasets:  this._datasets,
      height:    this._height,
    }
  }
}
