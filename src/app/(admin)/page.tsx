"use client";

import { useEffect, useState } from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { apiClient } from "@/lib/apiConfig";
import { Order } from "@/type/interface";

export default function Ecommerce() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadOrders = async () => {
      try {
        const response = await apiClient.orders.getOrders("today");
        if (!isMounted) return;

        if (response.success && response.data) {
          setOrders(response.data);
          setError(null);
        } else {
          setError(response.error || "Không thể tải số liệu doanh thu hôm nay.");
          setOrders([]);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Đã xảy ra lỗi khi tải số liệu doanh thu."
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void loadOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics orders={orders} isLoading={isLoading} error={error} />
        <RecentOrders orders={orders} isLoading={isLoading} error={error} />
      </div>
      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget orders={orders} isLoading={isLoading} error={error} />
      </div>
      <div className="col-span-12">
        <StatisticsChart />
      </div>
      <div className="col-span-12 xl:col-span-4">
        <DemographicCard />
      </div>
      <div className="col-span-12 xl:col-span-8">
        <MonthlySalesChart />
      </div>
    </div>
  );
}
