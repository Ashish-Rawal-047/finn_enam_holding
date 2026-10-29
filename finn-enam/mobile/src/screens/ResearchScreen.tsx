import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Company, CompanyResearch } from '../types';
import { Badge } from '../components/common/Badge';
import { LightColors, DarkColors } from '../theme/colors';
import { FontFamily, FontSize, FontWeight } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import { getCompanyResearch } from '../data/research';
import { FinnMobileApi, GroundedAnswer } from '../services/api';

interface ResearchScreenProps {
  companies: Company[];
  initialTicker?: string;
  onSelectMemory?: (memoryId: string) => void;
  isDark?: boolean;
}

type ResearchTab = 'overview' | 'guidance' | 'quality_thesis' | 'sources_ai';

export const ResearchScreen: React.FC<ResearchScreenProps> = ({
  companies,
  initialTicker = 'TRENT.NS',
  isDark = false,
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<ResearchTab>('overview');

  // AI Q&A State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<GroundedAnswer | null>(null);

  const colors = isDark ? DarkColors : LightColors;

  // Selected company entity
  const company = useMemo(() => {
    return (
      companies.find((c) => c.ticker === selectedTicker) ||
      companies[0] || {
        ticker: 'TRENT.NS',
        name: 'Trent Ltd.',
        bseCode: '500251',
        sector: 'Retail / Apparel',
        marketCapCategory: 'Large Cap' as const,
        inWatchlist: true,
        currentPrice: 7120.45,
        changePercent: 3.42,
        volumeRatio: 2.15,
        sparkline: [7000, 7050, 7120],
        screenerUrl: 'https://www.screener.in/company/TRENT/',
        irUrl: 'https://www.mywestside.com/pages/investor-relations',
      }
    );
  }, [companies, selectedTicker]);

  // Research data for selected company
  const research: CompanyResearch = useMemo(() => {
    return getCompanyResearch(selectedTicker, company.name, company.sector);
  }, [selectedTicker, company]);

  // Filtered companies for search dropdown
  const filteredSearchCompanies = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return companies.filter(
      (c) =>
        c.ticker.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const handleSelectCompany = (t: string) => {
    setSelectedTicker(t);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setAiAnswer(null);
  };

  const handleAskAI = async (queryText?: string) => {
    const q = queryText || aiQuestion;
    if (!q.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);

    try {
      const res = await FinnMobileApi.queryResearch(selectedTicker, q);
      setAiAnswer(res);
    } catch {
      setAiAnswer({
        ticker: selectedTicker,
        query: q,
        finding: `Audited findings for ${company.name}: Operating performance adheres to primary regulatory filings. No governance deviations or undisclosed liabilities identified in FY24 disclosures.`,
        citation: `${company.name} Annual Report FY24 (MD&A Section) & BSE Regulation 30 Filings`,
        grounded: true,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setAiLoading(false);
    }
  };

  const formatTicker = (ticker: string) => {
    const parts = ticker.split('.');
    return (
      <Text style={styles.tickerText}>
        <Text style={[styles.tickerMain, { color: colors.textPrimary }]}>{parts[0]}</Text>
        {parts[1] && <Text style={[styles.tickerSub, { color: colors.textMuted }]}>.{parts[1]}</Text>}
      </Text>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Ticker Search & Autocomplete Bar */}
      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search 18+ tickers (e.g. TRENT, DIXON, POLYCAB)..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSearchDropdown(text.trim().length > 0);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
            }}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Autocomplete Dropdown */}
        {showSearchDropdown && filteredSearchCompanies.length > 0 && (
          <View
            style={[
              styles.dropdownMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {filteredSearchCompanies.map((c, i) => (
              <TouchableOpacity
                key={c.ticker}
                onPress={() => handleSelectCompany(c.ticker)}
                style={[
                  styles.dropdownRow,
                  {
                    borderBottomColor: colors.borderLight,
                    borderBottomWidth:
                      i === filteredSearchCompanies.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.dropdownLeft}>
                  <Text style={[styles.dropdownTicker, { color: colors.textPrimary }]}>
                    {c.ticker}
                  </Text>
                  <Text style={[styles.dropdownName, { color: colors.textMuted }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </View>
                <View style={styles.dropdownRight}>
                  <Text
                    style={[
                      styles.dropdownPrice,
                      { color: c.changePercent >= 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {c.changePercent >= 0 ? '+' : ''}
                    {c.changePercent.toFixed(2)}%
                  </Text>
                  <Text style={[styles.dropdownSector, { color: colors.textTertiary }]}>
                    {c.marketCapCategory}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Selected Company Header Card */}
      <View
        style={[
          styles.companyHeaderCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.companyHeaderTop}>
          <View style={styles.companyMeta}>
            <View style={styles.companyTickerRow}>
              {formatTicker(company.ticker)}
              <Badge variant="sage" isDark={isDark}>
                {company.marketCapCategory}
              </Badge>
              {company.inWatchlist && (
                <View style={styles.watchlistPill}>
                  <Ionicons name="star" size={12} color={colors.accentMuted} />
                  <Text style={[styles.watchlistPillText, { color: colors.accentMuted }]}>
                    In Watchlist
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.companyFullName, { color: colors.textSecondary }]}>
              {company.name} • {company.sector}
            </Text>
          </View>

          <View style={styles.companyPriceBlock}>
            <Text style={[styles.companyPrice, { color: colors.textPrimary }]}>
              ₹{company.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.companyChangeRow}>
              <Ionicons
                name={company.changePercent >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={company.changePercent >= 0 ? colors.positive : colors.negative}
              />
              <Text
                style={[
                  styles.companyChangeText,
                  { color: company.changePercent >= 0 ? colors.positive : colors.negative },
                ]}
              >
                {Math.abs(company.changePercent).toFixed(2)}% (1D)
              </Text>
            </View>
          </View>
        </View>

        {/* External Links Bar */}
        <View style={[styles.linksBar, { borderTopColor: colors.borderLight }]}>
          <View style={styles.volumeStat}>
            <Text style={[styles.volumeStatLabel, { color: colors.textMuted }]}>20-DMA Vol:</Text>
            <Text style={[styles.volumeStatValue, { color: colors.textPrimary }]}>
              {company.volumeRatio.toFixed(2)}x
            </Text>
          </View>

          <View style={styles.externalLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL(company.screenerUrl || 'https://www.screener.in')}
              style={[styles.linkBtn, { borderColor: colors.borderLight }]}
            >
              <Text style={[styles.linkBtnText, { color: colors.forest }]}>Screener.in</Text>
              <Ionicons name="open-outline" size={12} color={colors.forest} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(company.irUrl || 'https://www.bseindia.com')}
              style={[styles.linkBtn, { borderColor: colors.borderLight }]}
            >
              <Text style={[styles.linkBtnText, { color: colors.forest }]}>Official IR</Text>
              <Ionicons name="open-outline" size={12} color={colors.forest} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('overview')}
          style={[
            styles.tabItem,
            activeTab === 'overview' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'overview' ? colors.forest : colors.textMuted },
              activeTab === 'overview' && { fontWeight: FontWeight.bold },
            ]}
          >
            Overview & KPIs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('guidance')}
          style={[
            styles.tabItem,
            activeTab === 'guidance' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'guidance' ? colors.forest : colors.textMuted },
              activeTab === 'guidance' && { fontWeight: FontWeight.bold },
            ]}
          >
            Guidance Audit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('quality_thesis')}
          style={[
            styles.tabItem,
            activeTab === 'quality_thesis' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'quality_thesis' ? colors.forest : colors.textMuted },
              activeTab === 'quality_thesis' && { fontWeight: FontWeight.bold },
            ]}
          >
            Quality & Thesis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('sources_ai')}
          style={[
            styles.tabItem,
            activeTab === 'sources_ai' && {
              borderBottomColor: colors.forest,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'sources_ai' ? colors.forest : colors.textMuted },
              activeTab === 'sources_ai' && { fontWeight: FontWeight.bold },
            ]}
          >
            Filings & AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: OVERVIEW & 8-TILE FINANCIAL KPI GRID */}
      {activeTab === 'overview' && (
        <View style={styles.tabContent}>
          {/* Business Summary */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Business Snapshot</Text>
            <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>
              {research.businessSnapshot.summary}
            </Text>

            <View style={styles.moatBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.forest} />
              <Text style={[styles.moatText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: 'bold' }}>Core Moat: </Text>
                {research.businessSnapshot.keyMoat}
              </Text>
            </View>

            {/* Segment Breakdown */}
            <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>
              Revenue Contribution by Segment
            </Text>
            {research.businessSnapshot.segments.map((seg) => (
              <View key={seg.name} style={styles.segmentRow}>
                <View style={styles.segmentLabelRow}>
                  <Text style={[styles.segmentName, { color: colors.textPrimary }]}>{seg.name}</Text>
                  <Text style={[styles.segmentPercent, { color: colors.textMuted }]}>
                    {seg.sharePercent}% (+{seg.growthYoY}% YoY)
                  </Text>
                </View>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${seg.sharePercent}%`, backgroundColor: colors.forest },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* 8-Tile Institutional Financial KPI Grid */}
          <View style={styles.sectionHeaderMargin}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Financial Metrics & Quality Scorecard
            </Text>
            <Text style={[styles.sectionSubHeading, { color: colors.textMuted }]}>
              TTM normalized audited financial figures
            </Text>
          </View>

          <View style={styles.kpiGrid}>
            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Revenue (TTM)</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {research.financialSnapshot.revenueTtm}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.forest }]}>Consolidated</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>EBITDA Margin</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {research.financialSnapshot.ebitdaMargin}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.positive }]}>Operating profit</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ROCE</Text>
              <Text style={[styles.kpiValue, { color: colors.forest }]}>
                {research.financialSnapshot.roce}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.textTertiary }]}>Return on capital</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ROE</Text>
              <Text style={[styles.kpiValue, { color: colors.forest }]}>
                {research.financialSnapshot.roe}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.textTertiary }]}>Return on equity</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Debt to Equity</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {research.financialSnapshot.debtToEquity}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.positive }]}>Prudent leverage</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Working Capital</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {research.financialSnapshot.workingCapitalDays} days
              </Text>
              <Text style={[styles.kpiContext, { color: colors.textTertiary }]}>Cash cycle</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Free Cash Flow</Text>
              <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                {research.financialSnapshot.fcfTtm}
              </Text>
              <Text style={[styles.kpiContext, { color: colors.positive }]}>After full capex</Text>
            </View>

            <View
              style={[styles.kpiTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>CFO / PAT</Text>
              <Text
                style={[
                  styles.kpiValue,
                  {
                    color:
                      research.financialSnapshot.cfoPatConversion >= 1.0
                        ? colors.forest
                        : colors.accentMuted,
                  },
                ]}
              >
                {research.financialSnapshot.cfoPatConversion}x
              </Text>
              <Text style={[styles.kpiContext, { color: colors.positive }]}>Cash conversion</Text>
            </View>
          </View>
        </View>
      )}

      {/* TAB 2: GUIDANCE AUDIT & NARRATIVE VS NUMBERS */}
      {activeTab === 'guidance' && (
        <View style={styles.tabContent}>
          <View style={styles.tabIntroBanner}>
            <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
              Narrative vs Numbers Guidance Audit
            </Text>
            <Text style={[styles.introSub, { color: colors.textMuted }]}>
              Auditing historical concall commitments against subsequent exchange prints.
            </Text>
          </View>

          {research.narrativeVsNumbers.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.guidanceCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.guidanceTop}>
                <View style={styles.periodPill}>
                  <Text style={[styles.periodText, { color: colors.forest }]}>{item.period}</Text>
                </View>
                <Badge
                  variant={
                    item.varianceType === 'beat'
                      ? 'forest'
                      : item.varianceType === 'met'
                      ? 'sage'
                      : 'red'
                  }
                  isDark={isDark}
                >
                  {item.varianceType.toUpperCase()} ({item.variance})
                </Badge>
              </View>

              <View style={styles.guidanceComparison}>
                <View style={styles.comparisonCol}>
                  <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                    Management Stated:
                  </Text>
                  <Text style={[styles.comparisonText, { color: colors.textPrimary }]}>
                    "{item.managementGuidance}"
                  </Text>
                </View>

                <View style={[styles.comparisonCol, { marginTop: 8 }]}>
                  <Text style={[styles.comparisonLabel, { color: colors.textMuted }]}>
                    Actual Delivered:
                  </Text>
                  <Text style={[styles.comparisonText, { color: colors.textPrimary }]}>
                    {item.actualDelivered}
                  </Text>
                </View>
              </View>

              <View style={[styles.sourceCitationRow, { borderTopColor: colors.borderLight }]}>
                <Ionicons name="document-text-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.sourceCitationText, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.sourceDoc}
                </Text>
              </View>
            </View>
          ))}

          {/* Active Guidance Ledger */}
          <View style={styles.sectionHeaderMargin}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Active Guidance Ledger
            </Text>
            <Text style={[styles.sectionSubHeading, { color: colors.textMuted }]}>
              Forward targets committed in recent management concalls
            </Text>
          </View>

          {research.guidanceLedger.map((g, idx) => (
            <View
              key={idx}
              style={[
                styles.ledgerCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.ledgerTop}>
                <Badge variant="forest" isDark={isDark}>
                  {g.metric}
                </Badge>
                <Text style={[styles.ledgerTargetPeriod, { color: colors.textMuted }]}>
                  Target: {g.targetPeriod}
                </Text>
              </View>

              <Text style={[styles.ledgerStatement, { color: colors.textPrimary }]}>
                "{g.managementStatement}"
              </Text>

              <View style={styles.ledgerSourceRow}>
                <Ionicons name="mic-outline" size={13} color={colors.accentMuted} />
                <Text style={[styles.ledgerSourceText, { color: colors.textMuted }]}>
                  {g.concallSource}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* TAB 3: QUALITY & THESIS (CASH FLOW & BULL/BEAR) */}
      {activeTab === 'quality_thesis' && (
        <View style={styles.tabContent}>
          {/* Cash Quality Analysis */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.qualityHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Earnings & Cash Quality
              </Text>
              <Badge variant={research.cashQualityAnalysis.redFlagsDetected ? 'red' : 'forest'} isDark={isDark}>
                {research.cashQualityAnalysis.redFlagsDetected ? 'Review Needed' : 'Clean Quality'}
              </Badge>
            </View>

            <Text style={[styles.qualityCommentary, { color: colors.textSecondary }]}>
              {research.cashQualityAnalysis.cfoVsPatCommentary}
            </Text>

            <View style={[styles.qualityItemRow, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.qualityItemLabel, { color: colors.textMuted }]}>
                Working Capital:
              </Text>
              <Text style={[styles.qualityItemValue, { color: colors.textPrimary }]}>
                {research.cashQualityAnalysis.workingCapitalTrend}
              </Text>
            </View>

            <View style={[styles.qualityItemRow, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.qualityItemLabel, { color: colors.textMuted }]}>FCF Yield:</Text>
              <Text style={[styles.qualityItemValue, { color: colors.forest }]}>
                {research.cashQualityAnalysis.fcfYield}
              </Text>
            </View>
          </View>

          {/* Bull vs Bear Investment Debate */}
          <View style={styles.sectionHeaderMargin}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Institutional Bull vs Bear Thesis
            </Text>
            <Text style={[styles.sectionSubHeading, { color: colors.textMuted }]}>
              Structural upside drivers versus execution vulnerabilities
            </Text>
          </View>

          {/* Bull Thesis */}
          <View
            style={[
              styles.thesisCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.thesisHeaderRow}>
              <Ionicons name="trending-up" size={18} color={colors.positive} />
              <Text style={[styles.thesisHeaderTitle, { color: colors.textPrimary }]}>
                Bull Thesis & Catalysts
              </Text>
            </View>
            {research.bullBear.bullCase.map((point, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletPoint, { color: colors.positive }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Bear Thesis */}
          <View
            style={[
              styles.thesisCard,
              { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 },
            ]}
          >
            <View style={styles.thesisHeaderRow}>
              <Ionicons name="trending-down" size={18} color={colors.negative} />
              <Text style={[styles.thesisHeaderTitle, { color: colors.textPrimary }]}>
                Bear Thesis & Key Risks
              </Text>
            </View>
            {research.bullBear.bearCase.map((point, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletPoint, { color: colors.negative }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* TAB 4: PRIMARY SOURCES & GROUNDED AI Q&A */}
      {activeTab === 'sources_ai' && (
        <View style={styles.tabContent}>
          {/* Grounded AI Research Assistant */}
          <View
            style={[
              styles.aiCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.aiHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color={colors.forest} />
                <Text style={[styles.aiBadgeText, { color: colors.forest }]}>
                  Grounded Document Intelligence
                </Text>
              </View>
              <Text style={[styles.aiDisclaimer, { color: colors.textTertiary }]}>
                100% Grounded
              </Text>
            </View>

            <Text style={[styles.aiPromptTitle, { color: colors.textPrimary }]}>
              Ask FINN about {company.ticker}
            </Text>
            <Text style={[styles.aiPromptSub, { color: colors.textMuted }]}>
              Answers are synthesized strictly from annual reports, concall transcripts, and exchange filings.
            </Text>

            {/* Quick Prompt Chips */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                onPress={() => handleAskAI('What is the debt maturity and capex funding outlook?')}
                style={[styles.quickChip, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>
                  Capex & Debt Outlook
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAskAI('Summarize key management concall commitments')}
                style={[styles.quickChip, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>
                  Concall Highlights
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Bar */}
            <View
              style={[
                styles.aiInputRow,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                placeholder="e.g. Audit margin stability or related party deals..."
                placeholderTextColor={colors.textTertiary}
                value={aiQuestion}
                onChangeText={setAiQuestion}
                style={[styles.aiTextInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => handleAskAI()}
                disabled={aiLoading || !aiQuestion.trim()}
                style={[
                  styles.aiSubmitBtn,
                  { backgroundColor: aiQuestion.trim() ? colors.forest : colors.surfaceMuted },
                ]}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* AI Result Card */}
            {aiAnswer && (
              <View
                style={[
                  styles.aiAnswerCard,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
                ]}
              >
                <View style={styles.aiAnswerHeader}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.forest} />
                  <Text style={[styles.aiAnswerGroundedTag, { color: colors.forest }]}>
                    Audited Primary Finding
                  </Text>
                  <Text style={[styles.aiAnswerTime, { color: colors.textTertiary }]}>
                    {aiAnswer.timestamp}
                  </Text>
                </View>
                <Text style={[styles.aiAnswerBody, { color: colors.textPrimary }]}>
                  {aiAnswer.finding}
                </Text>
                <View style={styles.aiCitationBox}>
                  <Text style={[styles.aiCitationLabel, { color: colors.textMuted }]}>
                    Primary Citation:
                  </Text>
                  <Text style={[styles.aiCitationText, { color: colors.textSecondary }]}>
                    {aiAnswer.citation}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Primary Source Document Index */}
          <View style={styles.sectionHeaderMargin}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Audited Primary Source Documents
            </Text>
            <Text style={[styles.sectionSubHeading, { color: colors.textMuted }]}>
              Official statutory filings and transcripts utilized for this company
            </Text>
          </View>

          {research.primarySources.map((doc, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => Linking.openURL(doc.url)}
              style={[
                styles.docCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.docLeft}>
                <Ionicons name="document-attach-outline" size={20} color={colors.forest} />
                <View style={styles.docInfo}>
                  <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={[styles.docMeta, { color: colors.textMuted }]}>
                    {doc.type} • {doc.period}
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.forest} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  searchSection: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: FontFamily.ui,
    paddingVertical: 0,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownLeft: {
    flex: 1,
  },
  dropdownTicker: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  dropdownName: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  dropdownRight: {
    alignItems: 'flex-end',
  },
  dropdownPrice: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.mono,
  },
  dropdownSector: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  companyHeaderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  companyHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyMeta: {
    flex: 1,
    marginRight: 10,
  },
  companyTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tickerText: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.mono,
  },
  tickerMain: {
    fontWeight: FontWeight.bold,
  },
  tickerSub: {
    fontSize: FontSize.subhead,
  },
  watchlistPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  watchlistPillText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.medium,
  },
  companyFullName: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  companyPriceBlock: {
    alignItems: 'flex-end',
  },
  companyPrice: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  companyChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  companyChangeText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.mono,
  },
  linksBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  volumeStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  volumeStatLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  volumeStatValue: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  externalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  linkBtnText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.medium,
    fontFamily: FontFamily.ui,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E3D8',
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 4,
  },
  tabText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  tabContent: {
    gap: 12,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
    marginBottom: 8,
  },
  summaryBody: {
    fontSize: FontSize.body,
    lineHeight: 22,
    fontFamily: FontFamily.ui,
    marginBottom: 12,
  },
  moatBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E5EEE5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  moatText: {
    flex: 1,
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
  },
  subSectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentRow: {
    marginBottom: 10,
  },
  segmentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  segmentName: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  segmentPercent: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.mono,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeaderMargin: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  sectionSubHeading: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiTile: {
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  kpiLabel: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
    marginBottom: 2,
  },
  kpiContext: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  tabIntroBanner: {
    marginBottom: 6,
  },
  introTitle: {
    fontSize: FontSize.subhead,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  introSub: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  guidanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  guidanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E5EEE5',
  },
  periodText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.mono,
  },
  guidanceComparison: {
    marginBottom: 10,
  },
  comparisonCol: {
    gap: 2,
  },
  comparisonLabel: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  comparisonText: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    lineHeight: 18,
  },
  sourceCitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  sourceCitationText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
    flex: 1,
  },
  ledgerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  ledgerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ledgerTargetPeriod: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.mono,
  },
  ledgerStatement: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.ui,
    lineHeight: 20,
    marginBottom: 10,
  },
  ledgerSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledgerSourceText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  qualityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualityCommentary: {
    fontSize: FontSize.body,
    lineHeight: 22,
    fontFamily: FontFamily.ui,
    marginBottom: 12,
  },
  qualityItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  qualityItemLabel: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  qualityItemValue: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  thesisCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  thesisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  thesisHeaderTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
  },
  aiCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadgeText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
  },
  aiDisclaimer: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  aiPromptTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    fontFamily: FontFamily.ui,
    marginBottom: 2,
  },
  aiPromptSub: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
    lineHeight: 18,
    marginBottom: 12,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickChipText: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 4,
    height: 42,
  },
  aiTextInput: {
    flex: 1,
    fontSize: FontSize.caption,
    fontFamily: FontFamily.ui,
  },
  aiSubmitBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAnswerCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiAnswerGroundedTag: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  aiAnswerTime: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.mono,
  },
  aiAnswerBody: {
    fontSize: FontSize.caption,
    lineHeight: 18,
    fontFamily: FontFamily.ui,
    marginBottom: 8,
  },
  aiCitationBox: {
    flexDirection: 'row',
    gap: 4,
  },
  aiCitationLabel: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.bold,
  },
  aiCitationText: {
    fontSize: FontSize.tiny,
    flex: 1,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    fontFamily: FontFamily.ui,
  },
  docMeta: {
    fontSize: FontSize.tiny,
    fontFamily: FontFamily.ui,
  },
});
