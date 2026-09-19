import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Users, Banknote, Upload, PieChart, TrendingUp, Building2, UserCircle, Briefcase, Percent } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "@/lib/fake-framer-motion.jsx";
import DataErrorState from "@/components/DataErrorState";
import { fetchAll } from "@/lib/fetchAll";
import { validSalesOrders, columnPresent } from "@/lib/metrics";

function formatCurrency(val) {
  if (val === null || val === undefined) return "-";
  return `${Math.round(val).toLocaleString("fr-CA")} $`;
}

export default function RessourcesHumaines() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rh-data"],
    queryFn: async () => {
      const [employees, payrolls, transactions, orders] = await Promise.all([
        fetchAll(base44.entities.Employee),
        fetchAll(base44.entities.Payroll, "-period"),
        fetchAll(base44.entities.Transaction, "-date"),
        fetchAll(base44.entities.Order, "-date")
      ]);
      const normalizedEmployees = (employees || []).map((employee) => ({
        ...employee,
        employee_id: employee.employee_id || employee.id || employee.employee_number || employee.matricule,
        status: employee.status || "actif",
      }));
      const normalizedPayrolls = (payrolls || []).map((payroll) => ({
        ...payroll,
        employee_id: payroll.employee_id || payroll.employee_number || payroll.matricule,
        period: payroll.period || payroll.date || payroll.pay_period,
        total_cost: Number(payroll.total_cost) || (
          Number(payroll.regular_pay || 0) +
          Number(payroll.overtime || 0) +
          Number(payroll.bonus || 0) +
          Number(payroll.employer_cost || 0) +
          Number(payroll.salary || 0)
        ),
      }));
      return { employees: normalizedEmployees, payrolls: normalizedPayrolls, transactions: transactions || [], orders: orders || [] };
    }
  });

  const { timeSeries, available } = useMemo(() => {
    if (!data) return { timeSeries: [], available: false };
    const byMonth = {};
    const add = (record, month, key, value) => {
      if (!month || !Number.isFinite(value)) return;
      byMonth[month] ||= { date: month, payroll_total: 0, total_revenue: 0 };
      byMonth[month][key] += value;
    };
    (data.payrolls || []).forEach((p) => {
      const month = String(p.period || p.date || "").slice(0, 7);
      add(p, month, "payroll_total", Math.abs(Number(p.total_cost) || 0));
    });
    // Refunded orders' money went back to the customer - excluded so
    // "CA par employé" / "Poids sur CA" don't count revenue that was reversed.
    validSalesOrders(data.orders).forEach((o) => {
      const month = String(o.date || "").slice(0, 7);
      // total_revenue is the field the import pipeline actually populates.
      const total = Number(o.total_revenue) || Number(o.total);
      if (month && Number.isFinite(total)) add(o, month, "total_revenue", Math.max(0, total));
    });

    // If payroll rows are missing but we have employee costs and order months,
    // distribute the payroll evenly across the active months so the chart works.
    if ((data.payrolls || []).length === 0 && (data.employees || []).length > 0) {
      const annualPayroll = (data.employees || []).reduce((s, e) => s + (Number(e.total_employer_cost) || Number(e.annual_salary) || Number(e.salary) || 0), 0);
      const months = Object.keys(byMonth);
      if (annualPayroll > 0 && months.length > 0) {
        const monthlyShare = annualPayroll / months.length;
        months.forEach((m) => {
          byMonth[m].payroll_total = Math.round(monthlyShare);
        });
      }
    }

    const rows = Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date));
    return { timeSeries: rows, available: rows.length > 0 };
  }, [data]);

  const { metrics, distribution } = useMemo(() => {
    if (!data) return { metrics: {}, distribution: [] };
    
    const activeEmployees = data.employees.filter(e => e.status !== "depart");
    const headcount = activeEmployees.length;
    
    const depts = {};
    activeEmployees.forEach(e => {
      const dept = e.department || "Non assigné";
      depts[dept] = (depts[dept] || 0) + 1;
    });
    const dist = Object.keys(depts).map(name => ({ name, value: depts[name] })).sort((a,b) => b.value - a.value);

    let totalPayroll = 0;
    let totalRev = 0;
    if (timeSeries && timeSeries.length > 0) {
      timeSeries.forEach(pt => {
        totalPayroll += (pt.payroll_total || 0);
        totalRev += (pt.total_revenue || 0);
      });
    }

    // Fallback: extract salaries from transactions if Payroll entity data is missing
    if (totalPayroll === 0 && data.transactions && data.transactions.length > 0) {
      const salaryKeywords = ["salaire", "salaires", "paie", "payroll", "masse salariale", "remuneration"];
      data.transactions.forEach(t => {
        const cat = (t.category || "").toLowerCase();
        const type = (t.type || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        if (salaryKeywords.some(k => cat.includes(k) || type.includes(k) || desc.includes(k))) {
          totalPayroll += Math.abs(Number(t.amount) || 0);
        }
      });
    }

    // Fallback: if no Payroll and no transaction salaries, sum employee annual costs/salaries
    if (totalPayroll === 0 && data.employees && data.employees.length > 0) {
      data.employees.forEach(e => {
        const cost = Number(e.total_employer_cost) || Number(e.annual_salary) || Number(e.salary) || 0;
        totalPayroll += cost;
      });
    }

    // Fallback: if totalRev is 0, sum orders
    if (totalRev === 0 && data.orders && data.orders.length > 0) {
      validSalesOrders(data.orders).forEach(o => {
        totalRev += (Number(o.total_revenue) || Number(o.total) || 0);
      });
    }

    const revPerEmp = headcount > 0 ? (totalRev / headcount) : 0;
    const ratio = totalRev > 0 ? (totalPayroll / totalRev) : 0;

    // Shown only when at least one employee actually carries a commission
    // rate, so a roster imported without one doesn't get a stat card of "0%".
    const withCommission = activeEmployees.filter((e) => e.commission_rate !== null && e.commission_rate !== undefined && e.commission_rate !== "");
    const avgCommission = withCommission.length > 0
      ? withCommission.reduce((s, e) => s + (Number(e.commission_rate) || 0), 0) / withCommission.length
      : null;

    // Fallback: if totalPayroll is still 0 but employees have commission rates and orders exist, compute commissions
    if (totalPayroll === 0 && withCommission.length > 0 && data.orders && data.orders.length > 0) {
      const empCommMap = {};
      withCommission.forEach(e => {
        empCommMap[e.employee_id] = Number(e.commission_rate) || 0;
      });
      data.orders.forEach(o => {
        const rate = empCommMap[o.employee_id] || (avgCommission || 0);
        const rev = Number(o.total_revenue) || Number(o.total) || 0;
        if (rate > 0 && rev > 0) {
          totalPayroll += rev * rate;
        }
      });
    }

    return {
      metrics: { headcount, totalPayroll, revPerEmp, ratio, totalRev, avgCommission },
      distribution: dist
    };
  }, [data, timeSeries]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    );
  }
  if (isError) return <DataErrorState onRetry={refetch} />;

  if (!data?.employees?.length && !data?.payrolls?.length && metrics.totalPayroll === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucune donnée RH"
        description="Importez la liste de vos employés ou vos données de paie pour suivre vos effectifs et coûts salariaux."
        action={
          <Link to="/importer">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Importer des données
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ressources Humaines</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Suivi de vos effectifs, de votre masse salariale et du rendement par employé. Analysez l'impact de vos ressources sur votre chiffre d'affaires.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard 
          label="Effectifs (actifs)" 
          value={metrics.headcount} 
          icon={Users} 
          accent="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          label="Masse Salariale Cumulée" 
          value={formatCurrency(metrics.totalPayroll)} 
          icon={Banknote} 
          accent="bg-rose-100 text-rose-600" 
        />
        <StatCard 
          label="CA par Employé" 
          value={formatCurrency(metrics.revPerEmp)} 
          icon={TrendingUp} 
          accent="bg-emerald-100 text-emerald-600" 
        />
        <StatCard
          label="Poids sur CA"
          value={`${(metrics.ratio * 100).toFixed(1)}%`}
          icon={PieChart}
          accent="bg-purple-100 text-purple-600"
        />
        {metrics.avgCommission !== null && (
          <StatCard
            label="Taux de commission moyen"
            value={`${(metrics.avgCommission <= 1 ? metrics.avgCommission * 100 : metrics.avgCommission).toFixed(1)}%`}
            icon={Percent}
            accent="bg-amber-100 text-amber-600"
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Évolution Masse Salariale vs CA</h3>
              <p className="text-sm text-muted-foreground">Comparaison temporelle</p>
            </div>
          </div>
          <div className="h-72">
            {available && timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `${v / 1000}k`} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    formatter={(value) => formatCurrency(value)} 
                  />
                  <Area type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Chiffre d'affaires" />
                  <Area type="monotone" dataKey="payroll_total" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorPayroll)" name="Masse salariale" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Pas assez de données temporelles
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Répartition par département</h3>
              <p className="text-sm text-muted-foreground">Effectifs actifs</p>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-72">
            {distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Effectif" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Aucun département renseigné
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">Annuaire des employés</h3>
            <p className="text-sm text-muted-foreground mt-1">Liste détaillée du personnel enregistré</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium shadow-sm">
            <Users className="h-4 w-4 text-slate-500" />
            <span>{data.employees.length} collaborateurs</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-muted-foreground border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">Collaborateur</th>
                <th className="px-6 py-4 font-medium">Département</th>
                <th className="px-6 py-4 font-medium">Rôle</th>
                <th className="px-6 py-4 font-medium">Contrat</th>
                {columnPresent(data.employees, "commission_rate") && (
                  <th className="px-6 py-4 font-medium">Commission</th>
                )}
                <th className="px-6 py-4 font-medium text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {data.employees.map((emp) => (
                <tr key={emp.id} className="transition-colors hover:bg-slate-50/80 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shadow-sm">
                        {String(emp.employee_id || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="font-medium text-slate-900">{emp.employee_id || "Inconnu"}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 hidden group-hover:block transition-all" />
                      {emp.department || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{emp.role || "-"}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      {emp.employment_type ? String(emp.employment_type).replace('_', ' ') : "-"}
                    </div>
                  </td>
                  {columnPresent(data.employees, "commission_rate") && (
                    <td className="px-6 py-4 text-slate-600">
                      {emp.commission_rate != null
                        ? `${(emp.commission_rate <= 1 ? emp.commission_rate * 100 : emp.commission_rate).toFixed(1)}%`
                        : "-"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      emp.status === 'actif' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' :
                      emp.status === 'depart' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' :
                      'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20'
                    }`}>
                      {emp.status === 'actif' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
                      {emp.status === 'depart' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>}
                      {String(emp.status || "Actif").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {data.employees.length === 0 && (
                <tr>
                  <td colSpan={columnPresent(data.employees, "commission_rate") ? 6 : 5} className="px-6 py-12 text-center">
                    <UserCircle className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                    <p className="text-muted-foreground">Aucun employé enregistré dans l'annuaire.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
