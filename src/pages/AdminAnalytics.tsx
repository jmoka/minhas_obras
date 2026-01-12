import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsStats, getPublicUrl } from "@/integrations/supabase/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Clock, TrendingUp, Globe, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

const AdminAnalytics: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["analytics-stats"],
    queryFn: getAnalyticsStats,
    refetchInterval: 30000,
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Analytics Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Total de Visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats?.totalVisits || 0}</div>
            <p className="text-xs text-blue-600 mt-1">Visitas ao site</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Visitantes Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats?.uniqueVisitors || 0}</div>
            <p className="text-xs text-green-600 mt-1">IPs únicos</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Views de Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{stats?.totalObraViews || 0}</div>
            <p className="text-xs text-purple-600 mt-1">Visualizações totais</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              {formatDuration(stats?.avgDuration || 0)}
            </div>
            <p className="text-xs text-orange-600 mt-1">Duração média</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-800">
              <TrendingUp className="w-5 h-5" />
              Top 10 Obras Mais Vistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topObras && stats.topObras.length > 0 ? (
                stats.topObras.map((item: any, index: number) => (
                  <Link
                    key={item.obra?.id || index}
                    to={`/obras/${item.obra?.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      {item.obra?.img ? (
                        <img
                          src={getPublicUrl(item.obra.img)}
                          alt={item.obra.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium text-gray-900">
                        {item.obra?.titulo || "Sem título"}
                      </p>
                      <p className="text-sm text-gray-500">{item.count} visualizações</p>
                    </div>
                    <div className="flex-shrink-0 text-2xl font-bold text-gray-300">
                      #{index + 1}
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhuma visualização ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-800">
              <Globe className="w-5 h-5" />
              Top 5 Países
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topCountries && stats.topCountries.length > 0 ? (
                stats.topCountries.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <p className="font-medium text-gray-900">{item.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-600">{item.count}</p>
                      <p className="text-xs text-gray-500">visitas</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Nenhum dado de localização</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
        <CardHeader>
          <CardTitle className="text-teal-800">Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Os dados são atualizados automaticamente a cada 30 segundos</p>
          <p>• Duração é calculada baseada no tempo de permanência na página</p>
          <p>• Dados de localização são obtidos via IP (aproximado)</p>
          <p>• IPs são armazenados para análise, mas podem ser hasheados para privacidade</p>
          <p>• Dados antigos (90+ dias) podem ser removidos automaticamente para conformidade LGPD</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
