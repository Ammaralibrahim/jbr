export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  unitId?: string;
  search?: string;
}

export interface DashboardStats {
  totalGeneration: number;
  totalConsumption: number;
  averageTemperature: number;
  operatingUnits: number;
  totalUnits: number;
  capacityFactor: number;
  availabilityFactor: number;
}