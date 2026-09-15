const fs = require('fs');

const raw = `
## revenue
Variantes :
chiffre d'affaires, chiffre affaire, chiffre affaires, CA, ca, ventes, vente, revenus, revenu, recettes commerciales, recettes, recettes de vente, revenu des ventes, revenus des ventes, montant des ventes, valeur des ventes, total des ventes, ventes nettes, chiffre d'affaires net, CA net, revenu commercial, produit des ventes, produit de vente, sales, sales revenue, revenue, revenues, turnover, net sales, sales amount, sales value, gross sales, commercial revenue, operating revenue

## gross_revenue
Variantes :
CA brut, chiffre d'affaires brut, ventes brutes, revenus bruts, recettes brutes, total brut des ventes, gross revenue, gross sales, gross turnover

## net_revenue
Variantes :
CA net, chiffre d'affaires net, ventes nettes, revenus nets, recettes nettes, net revenue, net sales, net turnover, sales after returns

## sales_quantity
Variantes :
quantité vendue, quantités vendues, volume vendu, unités vendues, unités écoulées, nombre d'unités vendues, ventes en unités, quantité de vente, quantité ventes, volume des ventes, volume de vente, quantité commandée, units sold, sold quantity, sales quantity, sales volume, units sold, volume sold

## sales_count
Variantes :
nombre de ventes, nombre de transactions, nombre de ventes réalisées, ventes réalisées, transactions de vente, opérations de vente, sales count, number of sales, sales transactions, transaction count

## order_count
Variantes :
nombre de commandes, commandes, total commandes, nombre commandes, volume de commandes, commandes reçues, orders, order count, number of orders, orders count, total orders

## order_value
Variantes :
valeur commande, valeur de commande, montant commande, montant de commande, total commande, total de commande, montant total commande, valeur totale commande, order value, order amount, order total, total order value, order revenue

## average_order_value
Variantes :
panier moyen, valeur moyenne commande, valeur moyenne des commandes, montant moyen commande, montant moyen des commandes, ticket moyen, panier moyen client, AOV, average order value, average basket, average order amount, average ticket

## cogs
Variantes :
coût des biens vendus, coût des marchandises vendues, coût des produits vendus, coût de revient des ventes, coût des ventes, coûts des ventes, coût marchandises, coût produit vendu, coût des articles vendus, coût d'achat des produits vendus, CMV, COGS, cost of goods sold, cost of sales, cost of goods, product cost sold

## gross_profit
Variantes :
marge brute en montant, profit brut, bénéfice brut, résultat brut, gain brut, marge brute $, marge brute montant, gross profit, gross margin amount, gross earnings, gross income

## gross_margin
Variantes :
marge brute, taux de marge brute, taux marge brute, marge commerciale, taux de marge commerciale, taux de profit brut, pourcentage marge brute, marge brute %, marge brute pourcentage, gross margin, gross margin rate, gross profit margin, gross margin percentage, GM, gross profit rate

## net_profit
Variantes :
bénéfice net, profit net, résultat net, revenu net, gain net, bénéfice final, résultat final, profit après dépenses, net profit, net income, net earnings, bottom line, net result

## net_margin
Variantes :
marge nette, taux de marge nette, taux marge nette, rentabilité nette, marge bénéficiaire nette, profit net %, résultat net %, net margin, net profit margin, net margin rate, net profitability

## operating_profit
Variantes :
résultat d'exploitation, bénéfice d'exploitation, profit opérationnel, résultat opérationnel, marge opérationnelle en montant, operating profit, operating income, EBIT, operating earnings

## operating_margin
Variantes :
marge opérationnelle, taux de marge opérationnelle, rentabilité opérationnelle, marge d'exploitation, operating margin, operating profit margin, operating profitability

## expense
Variantes :
dépense, dépenses, dépense totale, total dépenses, charge, charges, frais, frais totaux, coût opérationnel, coûts opérationnels, dépenses opérationnelles, charges opérationnelles, frais d'exploitation, operating expense, operating expenses, OPEX, expense, expenses, costs, operating costs

## fixed_cost
Variantes :
coûts fixes, coût fixe, charges fixes, frais fixes, dépenses fixes, coûts structurels, frais structurels, fixed cost, fixed costs, fixed expenses

## variable_cost
Variantes :
coûts variables, coût variable, charges variables, frais variables, dépenses variables, variable cost, variable costs, variable expenses

## break_even
Variantes :
seuil de rentabilité, point mort, seuil de rentabilité financier, chiffre d'affaires au seuil, CA au point mort, break even, break-even point, break-even sales, break-even revenue

## contribution_margin
Variantes :
marge sur coûts variables, marge contributive, taux de marge sur coûts variables, marge de contribution, contribution margin, contribution margin ratio, CM ratio

## cash_balance
Variantes :
trésorerie, trésorerie disponible, solde de trésorerie, solde bancaire, encaisse, encaisse disponible, liquidités, cash, cash disponible, cash balance, cash position, bank balance, available cash, cash on hand

## opening_cash
Variantes :
trésorerie initiale, solde initial, encaisse initiale, cash initial, solde de départ, opening cash, opening cash balance, beginning cash, starting cash

## closing_cash
Variantes :
trésorerie finale, solde final, encaisse finale, cash final, solde de clôture, closing cash, closing cash balance, ending cash, ending cash balance

## cash_in
Variantes :
entrées de trésorerie, entrée de cash, encaissements, recettes encaissées, cash entrant, flux entrants, encaissements clients, cash inflow, cash inflows, cash receipts, cash received

## cash_out
Variantes :
sorties de trésorerie, sortie de cash, décaissements, paiements, cash sortant, flux sortants, cash outflow, cash outflows, cash payments, cash paid

## accounts_receivable
Variantes :
comptes clients, comptes à recevoir, créances clients, créances, clients à recevoir, montant dû par clients, factures clients impayées, AR, A/R, accounts receivable, receivables, customer receivables, trade receivables

## accounts_payable
Variantes :
comptes fournisseurs, comptes à payer, dettes fournisseurs, fournisseurs à payer, factures fournisseurs impayées, montant dû aux fournisseurs, AP, A/P, accounts payable, payables, supplier payables, trade payables

## working_capital
Variantes :
besoin en fonds de roulement, BFR, fonds de roulement, besoin fonds roulement, working capital, working capital requirement, WCR, NWC, net working capital

## cash_flow
Variantes :
flux de trésorerie, flux de cash, flux financier, mouvement de trésorerie, cash flow, cashflow, net cash flow, cash movement

## net_cash_generated
Variantes :
trésorerie nette générée, cash net généré, flux net généré, génération de trésorerie, net cash generated, net cash flow generated

## runway
Variantes :
autonomie de trésorerie, durée de trésorerie, durée de vie du cash, runway, cash runway, cash survival, months of cash

## customer_count
Variantes :
nombre de clients, nombre clients, clients, total clients, clientèle, base clients, nombre de comptes clients, customer count, number of customers, customers, client base

## new_customer_count
Variantes :
nouveaux clients, nouveaux clients acquis, nombre de nouveaux clients, nouveaux comptes, acquisition clients, new customers, new customer count, new clients, customer acquisition

## returning_customer_count
Variantes :
clients récurrents, clients existants, clients fidèles, clients de retour, clients récurrents, repeat customers, returning customers, returning clients, repeat buyers

## customer_acquisition_cost
Variantes :
coût acquisition client, coût d'acquisition client, CAC, coût acquisition, coût moyen acquisition, coût pour acquérir un client, customer acquisition cost, customer acquisition cost per customer, CAC

## customer_lifetime_value
Variantes :
valeur vie client, valeur vie du client, valeur client à vie, valeur vie clientèle, LTV, CLV, lifetime value, customer lifetime value, customer lifetime revenue

## churn_rate
Variantes :
taux d'attrition, taux de désabonnement, taux de départ clients, taux de perte clients, attrition client, churn, churn rate, customer churn, customer attrition rate

## retention_rate
Variantes :
taux de rétention, taux fidélisation, taux de conservation clients, rétention client, retention rate, customer retention, retention percentage

## repeat_purchase_rate
Variantes :
taux de réachat, taux de clients qui rachètent, fréquence de réachat, repeat purchase rate, repeat customer rate, repurchase rate

## customer_satisfaction
Variantes :
satisfaction client, satisfaction clients, score satisfaction, note satisfaction, indice satisfaction, satisfaction moyenne, customer satisfaction, CSAT, customer satisfaction score

## nps
Variantes :
NPS, score NPS, net promoter score, indice de recommandation, score de recommandation, taux promoteurs net

## conversion_rate
Variantes :
taux de conversion, taux conversion, conversion, taux transformation, taux de transformation, conversion rate, conversion percentage, sales conversion rate

## lead_count
Variantes :
nombre prospects, prospects, leads, prospects commerciaux, pistes commerciales, opportunités potentielles, lead count, leads, prospects count

## opportunity_count
Variantes :
nombre opportunités, opportunités, occasions de vente, opportunités commerciales, sales opportunities, opportunity count, opportunities

## win_rate
Variantes :
taux de réussite, taux de gain, taux de conclusion, taux de ventes gagnées, win rate, sales win rate, opportunity win rate, close rate

## average_sales_cycle
Variantes :
cycle de vente moyen, durée moyenne vente, durée cycle commercial, temps moyen de conversion, sales cycle, average sales cycle, sales cycle length

## sales_growth
Variantes :
croissance des ventes, croissance CA, croissance chiffre affaires, évolution ventes, variation ventes, croissance revenus, sales growth, revenue growth, sales increase

## sales_target
Variantes :
objectif ventes, cible ventes, objectif CA, cible CA, quota ventes, objectif chiffre d'affaires, sales target, sales goal, revenue target, sales quota

## marketing_spend
Variantes :
dépenses marketing, budget marketing consommé, coût marketing, dépenses de marketing, frais marketing, investissement marketing, marketing spend, marketing expenses, marketing cost, marketing budget spent

## advertising_spend
Variantes :
dépenses publicitaires, coût publicité, coûts publicitaires, budget publicité consommé, dépenses ads, dépenses annonces, ad spend, advertising spend, advertising cost, paid media spend

## ctr
Variantes :
taux de clic, taux clic, CTR, taux de clics, click through rate, click-through rate, click rate

## cpc
Variantes :
coût par clic, coût moyen par clic, CPC, cost per click, average cost per click

## cpa
Variantes :
coût par acquisition, coût acquisition, CPA, coût par conversion, cost per acquisition, cost per action, cost per conversion

## roas
Variantes :
retour sur dépenses publicitaires, retour publicité, ROAS, rendement publicitaire, return on ad spend, advertising return, ad spend return

## romi
Variantes :
retour sur investissement marketing, rendement marketing, ROMI, retour marketing, return on marketing investment, marketing ROI

## impressions
Variantes :
impressions, affichages, vues publicitaires, nombre affichages, nombre d'impressions, ad impressions, impressions count

## clicks
Variantes :
clics, nombre de clics, clics publicitaires, clicks, click count, ad clicks

## reach
Variantes :
portée, portée publicitaire, personnes atteintes, audience atteinte, reach, advertising reach, audience reach

## product_count
Variantes :
nombre produits, nombre de produits, produits, références, nombre références, SKU count, product count, number of products, products

## product_id
Variantes :
ID produit, identifiant produit, code produit, référence produit, SKU, code SKU, product id, product code, SKU code, item id

## product_name
Variantes :
nom produit, nom du produit, produit, désignation, libellé produit, description produit, product name, item name, product description

## category
Variantes :
catégorie, catégorie produit, famille produit, groupe produit, classe produit, segment produit, category, product category, product family, product group

## unit_price
Variantes :
prix unitaire, prix par unité, tarif unitaire, prix de vente unitaire, prix moyen unitaire, unit price, selling price per unit, price per unit

## unit_cost
Variantes :
coût unitaire, coût par unité, coût produit, coût d'achat unitaire, prix coûtant, unit cost, cost per unit, product unit cost

## inventory_quantity
Variantes :
quantité en stock, quantité stock, stock quantité, unités en stock, niveau de stock, inventaire quantité, quantité inventaire, inventory quantity, stock quantity, units in stock, inventory units

## inventory_value
Variantes :
valeur stock, valeur des stocks, valeur inventaire, valeur de l'inventaire, stock en valeur, inventory value, inventory valuation, stock value

## stock_turnover
Variantes :
rotation des stocks, taux rotation stock, rotation stock, coefficient rotation, stock turnover, inventory turnover, inventory turnover ratio

## stockout_count
Variantes :
ruptures de stock, nombre ruptures, rupture stock, nombre de ruptures, stockout count, stock outs, inventory stockouts

## stockout_rate
Variantes :
taux rupture, taux de rupture stock, taux ruptures, stockout rate, stockout percentage, out-of-stock rate

## days_inventory
Variantes :
jours de stock, jours couverture stock, couverture stock en jours, nombre jours stock, inventory days, days inventory, days of stock, inventory coverage days

## reorder_point
Variantes :
point de commande, seuil commande, niveau réapprovisionnement, seuil réapprovisionnement, reorder point, reorder level, replenishment point

## shrinkage
Variantes :
démarque, démarque inconnue, pertes inventaire, pertes de stock, écarts stock, vol, casse, stock shrinkage, inventory shrinkage, inventory loss

## shrinkage_rate
Variantes :
taux de démarque, taux démarque inconnue, taux de pertes stock, taux pertes inventaire, shrinkage rate, inventory shrinkage rate

## supplier_count
Variantes :
nombre fournisseurs, fournisseurs, nombre de fournisseurs, total fournisseurs, supplier count, number of suppliers, suppliers

## purchase_amount
Variantes :
montant achats, achats, total achats, valeur achats, dépenses achats, achats fournisseurs, purchase amount, purchases, purchase value, procurement spend

## purchase_quantity
Variantes :
quantité achetée, volume achats, unités achetées, quantité achat, purchase quantity, purchased quantity, units purchased

## purchase_order_count
Variantes :
nombre commandes fournisseurs, commandes achats, bons de commande, nombre bons commande, purchase orders, purchase order count, PO count

## supplier_lead_time
Variantes :
délai fournisseur, délai livraison fournisseur, délai approvisionnement, temps approvisionnement, lead time fournisseur, supplier lead time, supplier delivery time, procurement lead time

## supplier_cost
Variantes :
coût fournisseur, prix fournisseur, coût achat fournisseur, supplier cost, supplier price, procurement cost

## employee_count
Variantes :
nombre employés, nombre salariés, effectif, effectifs, employés, salariés, personnel, collaborateurs, headcount, employee count, number of employees, staff count, workforce

## payroll_cost
Variantes :
masse salariale, coût salarial, coûts salariaux, coût personnel, coût de personnel, paie totale, salaires totaux, dépenses paie, payroll, payroll cost, payroll expenses, labor cost, staff cost

## average_salary
Variantes :
salaire moyen, rémunération moyenne, salaire moyen employé, paie moyenne, coût salarial moyen, average salary, average wage, average compensation

## labor_cost
Variantes :
coût de main-d'oeuvre, coût main d'oeuvre, coût du travail, coût personnel, coût travail, labor cost, labour cost, workforce cost

## employee_turnover
Variantes :
taux de roulement, roulement du personnel, turnover employés, taux turnover, rotation personnel, employee turnover, staff turnover, employee turnover rate

## absenteeism_rate
Variantes :
taux absentéisme, absentéisme, taux d'absence, absence employés, absenteeism rate, absence rate, employee absenteeism

## hours_worked
Variantes :
heures travaillées, heures travail, nombre heures, heures effectuées, heures payées, temps travaillé, hours worked, worked hours, paid hours

## order_fulfillment_time
Variantes :
délai traitement commande, délai préparation commande, temps traitement commande, temps fulfillment, fulfillment time, order fulfillment time, order processing time

## delivery_time
Variantes :
délai livraison, temps livraison, durée livraison, délai moyen livraison, delivery time, delivery lead time, shipping time

## cancellation_rate
Variantes :
taux annulation, taux d'annulation commandes, commandes annulées %, cancellation rate, order cancellation rate

## return_rate
Variantes :
taux retour, taux de retours, retours produits, taux retours produits, return rate, product return rate, returns percentage

## refund_amount
Variantes :
montant remboursements, remboursements, valeur remboursements, total remboursements, refund amount, refunds, refunded amount, refund value

## discount_amount
Variantes :
montant remise, montant rabais, remises, rabais, réduction, réductions, valeur remise, discount amount, discount value, discounts

## discount_rate
Variantes :
taux remise, taux rabais, pourcentage remise, remise moyenne, discount rate, discount percentage, average discount

## promotion_sales
Variantes :
ventes promotionnelles, ventes en promotion, chiffre affaires promotion, CA promotion, revenus promotionnels, promotional sales, promotion revenue

## promotion_count
Variantes :
nombre promotions, promotions actives, campagnes promotionnelles, promotions, promotion count, number of promotions

## date
Variantes :
date, date transaction, date opération, date commande, date vente, date événement, jour, transaction date, order date, sales date, operation date

## year
Variantes :
année, an, exercice, année fiscale, année financière, year, fiscal year, financial year

## month
Variantes :
mois, période mensuelle, mois fiscal, month, monthly period, fiscal month

## quarter
Variantes :
trimestre, trimestre fiscal, période trimestrielle, quarter, fiscal quarter, quarterly period

## week
Variantes :
semaine, semaine fiscale, période hebdomadaire, week, fiscal week, weekly period

## transaction_id
Variantes :
ID transaction, identifiant transaction, numéro transaction, no transaction, numéro opération, transaction id, transaction number, transaction reference

## order_id
Variantes :
ID commande, identifiant commande, numéro commande, no commande, order id, order number, order reference

## customer_id
Variantes :
ID client, identifiant client, numéro client, code client, customer id, customer number, customer code

## supplier_id
Variantes :
ID fournisseur, identifiant fournisseur, numéro fournisseur, code fournisseur, supplier id, supplier number, supplier code

## employee_id
Variantes :
ID employé, identifiant employé, matricule, numéro employé, code employé, employee id, employee number, employee code

## region
Variantes :
région, région administrative, territoire, zone, secteur géographique, région commerciale, region, geographic region, territory, sales region

## city
Variantes :
ville, municipalité, commune, city, municipality, town

## country
Variantes :
pays, nation, country, market country

## store
Variantes :
magasin, boutique, succursale, point de vente, magasin physique, store, shop, branch, retail location, location

## sales_channel
Variantes :
canal de vente, canal commercial, canal, mode de vente, circuit de vente, sales channel, sales source, distribution channel

## sales_rep
Variantes :
vendeur, représentant commercial, conseiller ventes, représentant, commercial, agent commercial, sales representative, sales rep, salesperson, account executive

## cart_count
Variantes :
paniers, paniers créés, nombre paniers, shopping carts, cart count, carts created

## cart_abandonment_rate
Variantes :
taux abandon panier, taux d'abandon panier, paniers abandonnés, abandon panier, cart abandonment, cart abandonment rate, abandoned cart rate

## checkout_count
Variantes :
passages caisse, checkouts, nombre checkouts, checkout count, completed checkout attempts

## website_sessions
Variantes :
sessions site, sessions web, visites site, sessions, visites, trafic site, website sessions, web sessions, site visits, visits

## bounce_rate
Variantes :
taux rebond, taux de rebond, rebond, bounce rate, website bounce rate

## target
Variantes :
objectif, cible, cible KPI, valeur cible, objectif KPI, target, target value, goal, goal value, KPI target

## actual_value
Variantes :
valeur actuelle, valeur réelle, réalisé, réalisation, résultat actuel, valeur observée, actual, actual value, current value, achieved value

## variance
Variantes :
écart, variance, différence, écart objectif, écart cible, écart réalisé, variation par rapport objectif, variance, target variance, actual vs target

## achievement_rate
Variantes :
taux atteinte objectif, taux réalisation, taux d'atteinte, progression objectif, réalisation objectif, target achievement, achievement rate, goal completion rate

## growth_rate
Variantes :
taux croissance, taux de croissance, croissance, évolution, progression, variation relative, growth rate, growth percentage, growth

## change_amount
Variantes :
variation montant, écart montant, différence montant, changement montant, delta, amount change, absolute change, delta amount

## change_rate
Variantes :
variation %, variation pourcentage, taux variation, évolution %, changement %, percentage change, change rate, relative change

## average
Variantes :
moyenne, moyenne générale, moyenne pondérée, valeur moyenne, average, mean, weighted average

## minimum
Variantes :
minimum, valeur minimale, plus petite valeur, min, minimum value, lowest value

## maximum
Variantes :
maximum, valeur maximale, plus grande valeur, max, maximum value, highest value

## median
Variantes :
médiane, valeur médiane, median, median value

## status
Variantes :
statut, état, situation, status, state, condition

## type
Variantes :
type, catégorie, classe, nature, genre, type of, category, class, kind

## description
Variantes :
description, détail, commentaire, notes, remarque, information, description, details, notes, comment, remarks

## currency
Variantes :
devise, monnaie, currency, currency code, currency type, monnaie utilisée
`;

function cleCanonique(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

const lines = raw.split('\n');
let currentKey = null;
const aliases = {};

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('## ')) {
    currentKey = lines[i].replace('## ', '').trim();
  } else if (lines[i].startsWith('Variantes :')) {
    const vars = lines[i+1].split(',').map(v => v.trim()).filter(Boolean);
    vars.forEach(v => {
      const k = cleCanonique(v);
      if (k) aliases[k] = currentKey;
    });
  }
}

let file = fs.readFileSync('base44/shared/importUtils.ts', 'utf-8');

let newAliasesStr = 'export const ALIAS_CANONIQUES: Record<string, string> = {\n';
for (const [k, v] of Object.entries(aliases)) {
  newAliasesStr += `  "${k}": "${v}",\n`;
}
newAliasesStr += '};';

if (file.includes('export const ALIAS_CANONIQUES')) {
  file = file.replace(/export const ALIAS_CANONIQUES[\s\S]*?\};/, newAliasesStr);
} else {
  file = file.replace(/export const FIELD_ALIASES[\s\S]*?\};/, newAliasesStr.replace('ALIAS_CANONIQUES', 'FIELD_ALIASES'));
}

fs.writeFileSync('base44/shared/importUtils.ts', file);
console.log('Injected ' + Object.keys(aliases).length + ' aliases.');
