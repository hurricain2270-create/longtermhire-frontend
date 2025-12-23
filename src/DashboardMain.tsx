import React, { useState, useEffect } from "react";
import { dashboardApi } from "./services/dashboardApi";

// Skeleton Loading Components
const StatCardSkeleton = () => (
  <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between animate-pulse">
    <div className="h-4 bg-[#333333] rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-[#333333] rounded w-1/2"></div>
  </div>
);

const ActivitySkeleton = () => (
  <div className="space-y-4 sm:space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-[#333333] rounded w-1/4 mb-3"></div>
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3].map((j) => (
            <div
              key={j}
              className="flex items-start sm:items-center gap-3 sm:gap-4"
            >
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#333333] rounded-md flex-shrink-0"></div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-3 bg-[#333333] rounded w-3/4"></div>
                <div className="h-3 bg-[#333333] rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

function DashboardMain() {
  const [stats, setStats] = useState({
    total_companies: 0,
    total_clients: 0,
    total_equipment: 0,
    recent_messages: 0,
    pending_requests: 0,
    logins_today: 0,
    logins_this_week: 0,
  });
  const [recentActivity, setRecentActivity] = useState({
    recent_requests: [],
    recent_chat_activity: [],
    recent_client_logins: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearingLogs, setClearingLogs] = useState(false);

  // Load dashboard statistics
  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getStats();

      if (!response.error) {
        setStats(response.data.stats);
        setRecentActivity({
          recent_requests: response.data.recent_requests,
          recent_chat_activity: response.data.recent_chat_activity,
          recent_client_logins: response.data.recent_client_logins,
        });
      } else {
        setError(response.message || "Failed to load dashboard stats");
      }
    } catch (error) {
      console.error("Dashboard stats error:", error);
      setError("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      setClearingLogs(true);
      const response = await dashboardApi.clearLogs();

      if (!response.error) {
        // Reload dashboard stats after clearing logs
        await loadDashboardStats();
      } else {
        setError(response.message || "Failed to clear logs");
      }
    } catch (error) {
      console.error("Clear logs error:", error);
      setError("Failed to clear logs");
    } finally {
      setClearingLogs(false);
    }
  };

  return (
    <div className="relative p-4 sm:p-6 lg:p-8 w-full min-h-screen">
      {/* Header */}
      <header className="mb-8 sm:mb-10 lg:mb-12">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
          Dashboard
        </h1>
      </header>

      {/* Stats Section */}
      <section className="mb-8 sm:mb-10 lg:mb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 sm:gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadDashboardStats}
              className="mt-2 text-[#FDCE06] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 sm:gap-6">
            {/* Total Companies Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Total Companies
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.total_companies || 0}
              </p>
            </div>

            {/* Total Users Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Total Users
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.total_clients || 0}
              </p>
            </div>

            {/* Total Equipment Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Total Equipment
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.total_equipment || 0}
              </p>
            </div>

            {/* Pending Requests Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Pending Requests
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.pending_requests || 0}
              </p>
            </div>

            {/* Unread Messages Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Unread Messages
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.recent_messages || 0}
              </p>
            </div>

            {/* Logins Today Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Logins Today
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.logins_today || 0}
              </p>
            </div>

            {/* Logins This Week Card */}
            <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-4 sm:p-6 min-h-[100px] sm:min-h-[118px] flex flex-col justify-between">
              <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs sm:text-sm leading-tight mb-2">
                Logins This Week
              </p>
              <p className="text-[#E5E5E5] font-[Inter] font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
                {stats.logins_this_week || 0}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity Section */}
      <section className="bg-[#1F1F20] border border-[#333333] rounded-lg w-full">
        {/* Header */}
        <div className="border-b border-[#333333] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-[#FDCE06] font-[Inter] font-medium text-sm sm:text-base leading-tight">
            Recent Activity (Last 7 Days)
          </h2>
          <button
            onClick={handleClearLogs}
            disabled={clearingLogs}
            className="text-[#9CA3AF] hover:text-[#E5E5E5] text-xs sm:text-sm underline transition-colors disabled:opacity-50"
          >
            {clearingLogs ? "Clearing..." : "clear all"}
          </button>
        </div>

        {/* Activity Content */}
        <div className="px-4 sm:px-6 py-4 max-h-80 sm:max-h-96 overflow-y-auto">
          {loading ? (
            <ActivitySkeleton />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Recent Equipment Requests */}
              {recentActivity.recent_requests.length > 0 && (
                <div>
                  <h3 className="text-[#E5E5E5] font-[Inter] font-medium text-sm mb-3">
                    Recent Equipment Requests
                  </h3>
                  <ul className="space-y-2 sm:space-y-3">
                    {recentActivity.recent_requests
                      .slice(0, 5)
                      .map((request, index) => (
                        <li
                          key={index}
                          className="flex items-start sm:items-center gap-3 sm:gap-4"
                        >
                          <span className="flex items-center justify-center rounded-md w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 flex-shrink-0 mt-1 sm:mt-0">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#E5E5E5] font-[Inter] font-normal text-xs sm:text-sm break-words">
                              {request.client_name} requested{" "}
                              {request.equipment_id}
                            </p>
                            <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs">
                              {new Date(request.request_date).toLocaleString()}{" "}
                              • {request.status}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Recent Chat Activity */}
              {recentActivity.recent_chat_activity.length > 0 && (
                <div>
                  <h3 className="text-[#E5E5E5] font-[Inter] font-medium text-sm mb-3">
                    Recent Chat Activity
                  </h3>
                  <ul className="space-y-2 sm:space-y-3">
                    {recentActivity.recent_chat_activity
                      .slice(0, 5)
                      .map((activity, index) => (
                        <li
                          key={index}
                          className="flex items-start sm:items-center gap-3 sm:gap-4"
                        >
                          <span className="flex items-center justify-center rounded-md w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500/20 flex-shrink-0 mt-1 sm:mt-0">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#E5E5E5] font-[Inter] font-normal text-xs sm:text-sm break-words">
                              {activity.user_name}{" "}
                              {activity.activity_type === "equipment_request"
                                ? "sent equipment request"
                                : "sent message"}
                            </p>
                            <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs">
                              {new Date(
                                activity.activity_time
                              ).toLocaleString()}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Recent Client Logins */}
              {recentActivity.recent_client_logins.length > 0 && (
                <div>
                  <h3 className="text-[#E5E5E5] font-[Inter] font-medium text-sm mb-3">
                    Recent Client Logins
                  </h3>
                  <ul className="space-y-2 sm:space-y-3">
                    {recentActivity.recent_client_logins
                      .slice(0, 5)
                      .map((login, index) => (
                        <li
                          key={index}
                          className="flex items-start sm:items-center gap-3 sm:gap-4"
                        >
                          <span className="flex items-center justify-center rounded-md w-6 h-6 sm:w-8 sm:h-8 bg-green-500/20 flex-shrink-0 mt-1 sm:mt-0">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#E5E5E5] font-[Inter] font-normal text-xs sm:text-sm break-words">
                              {login.client_name || `Client ${login.client_id}`}{" "}
                              logged in
                            </p>
                            <p className="text-[#9CA3AF] font-[Inter] font-normal text-xs">
                              {new Date(login.login_time).toLocaleString()} •{" "}
                              {login.ip_address}
                            </p>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* No Activity Message */}
              {recentActivity.recent_requests.length === 0 &&
                recentActivity.recent_chat_activity.length === 0 &&
                recentActivity.recent_client_logins.length === 0 && (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-[#9CA3AF] font-[Inter] font-normal text-sm">
                      No recent activity in the last 7 days
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardMain;
