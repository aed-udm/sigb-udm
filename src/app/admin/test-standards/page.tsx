"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CheckCircle,
    XCircle,
    Clock,
    Play,
    RefreshCw,
    FileText,
    Database,
    Globe,
    Shield,
    Search,
    BarChart3,
    Download
} from 'lucide-react';

interface TestResult {
    testName: string;
    passed: boolean;
    details: string;
    timestamp: string;
    duration?: number;
}

interface CategoryResults {
    passed: number;
    failed: number;
    tests: TestResult[];
    running: boolean;
}

interface TestResults {
    dublinCore: CategoryResults;
    marc21: CategoryResults;
    oaiPmh: CategoryResults;
    cames: CategoryResults;
    pdfA: CategoryResults;
    z3950: CategoryResults;
    monitoring: CategoryResults;
}

const STANDARD_CONFIGS = {
    dublinCore: {
        name: 'Dublin Core',
        icon: Database,
        color: 'blue',
        description: 'Métadonnées standardisées'
    },
    marc21: {
        name: 'MARC21',
        icon: FileText,
        color: 'green',
        description: 'Format bibliographique'
    },
    oaiPmh: {
        name: 'OAI-PMH',
        icon: Globe,
        color: 'purple',
        description: 'Protocole de moissonnage'
    },
    cames: {
        name: 'CAMES/DICAMES',
        icon: BarChart3,
        color: 'orange',
        description: 'Standards africains'
    },
    pdfA: {
        name: 'PDF/A',
        icon: Shield,
        color: 'red',
        description: 'Validation archivage'
    },
    z3950: {
        name: 'Z39.50',
        icon: Search,
        color: 'indigo',
        description: 'Recherche fédérée'
    },
    monitoring: {
        name: 'Monitoring',
        icon: BarChart3,
        color: 'teal',
        description: 'Surveillance temps réel'
    }
};

export default function TestStandardsPage() {
    const [testResults, setTestResults] = useState<TestResults>({
        dublinCore: { passed: 0, failed: 0, tests: [], running: false },
        marc21: { passed: 0, failed: 0, tests: [], running: false },
        oaiPmh: { passed: 0, failed: 0, tests: [], running: false },
        cames: { passed: 0, failed: 0, tests: [], running: false },
        pdfA: { passed: 0, failed: 0, tests: [], running: false },
        z3950: { passed: 0, failed: 0, tests: [], running: false },
        monitoring: { passed: 0, failed: 0, tests: [], running: false }
    });

    const [globalTesting, setGlobalTesting] = useState(false);
    const [testProgress, setTestProgress] = useState(0);

    const runSingleTest = async (standard: keyof TestResults) => {
        setTestResults(prev => ({
            ...prev,
            [standard]: { ...prev[standard], running: true, tests: [] }
        }));

        try {
            const response = await fetch('/api/test-standards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ standard })
            });

            const data = await response.json();

            if (data.success) {
                setTestResults(prev => ({
                    ...prev,
                    [standard]: {
                        ...data.results,
                        running: false
                    }
                }));
            }
        } catch (error) {
            console.error(`Erreur test ${standard}:`, error);
            setTestResults(prev => ({
                ...prev,
                [standard]: {
                    passed: 0,
                    failed: 1,
                    tests: [{
                        testName: 'Connexion API',
                        passed: false,
                        details: 'Erreur de connexion',
                        timestamp: new Date().toISOString()
                    }],
                    running: false
                }
            }));
        }
    };

    const runAllTests = async () => {
        setGlobalTesting(true);
        setTestProgress(0);

        const standards = Object.keys(testResults) as (keyof TestResults)[];

        for (let i = 0; i < standards.length; i++) {
            const standard = standards[i];
            await runSingleTest(standard);
            setTestProgress(((i + 1) / standards.length) * 100);
        }

        setGlobalTesting(false);
    };

    const downloadReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            results: testResults,
            summary: calculateSummary()
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-tests-standards-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const calculateSummary = () => {
        const totalTests = Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0);
        const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
        const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

        return { totalTests, totalPassed, totalFailed: totalTests - totalPassed, successRate };
    };

    const summary = calculateSummary();

    return (
        <div className="container mx-auto py-6 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Tests de Conformité aux Standards
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Validation complète de tous les standards bibliographiques implémentés
                    </p>
                </div>

                <div className="flex items-center space-x-4">
                    <Button onClick={downloadReport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger Rapport
                    </Button>
                    <Button
                        onClick={runAllTests}
                        disabled={globalTesting}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {globalTesting ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 mr-2" />
                        )}
                        {globalTesting ? 'Tests en cours...' : 'Lancer Tous les Tests'}
                    </Button>
                </div>
            </div>

            {/* Résumé global */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Résumé Global
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{summary.totalTests}</div>
                            <div className="text-sm text-gray-600">Tests Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{summary.totalPassed}</div>
                            <div className="text-sm text-gray-600">Réussis</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{summary.totalFailed}</div>
                            <div className="text-sm text-gray-600">Échoués</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{summary.successRate}%</div>
                            <div className="text-sm text-gray-600">Taux de Réussite</div>
                        </div>
                    </div>

                    {globalTesting && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progression des tests</span>
                                <span>{Math.round(testProgress)}%</span>
                            </div>
                            <Progress value={testProgress} className="w-full" />
                        </div>
                    )}

                    <div className="mt-4">
                        <Badge
                            className={`text-lg px-4 py-2 ${summary.successRate === 100 ? "bg-green-100 text-green-800" :
                                    summary.successRate >= 80 ? "bg-yellow-100 text-yellow-800" :
                                        "bg-red-100 text-red-800"
                                }`}
                        >
                            {summary.successRate === 100 ? '🏆 CONFORMITÉ PARFAITE' :
                                summary.successRate >= 95 ? '✅ EXCELLENTE' :
                                    summary.successRate >= 85 ? '🟢 AVANCÉE' :
                                        summary.successRate >= 70 ? '🟡 STANDARD' :
                                            summary.successRate >= 50 ? '🟠 BASIQUE' : '❌ CRITIQUE'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Tests par standard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(STANDARD_CONFIGS).map(([key, config]) => {
                    const results = testResults[key as keyof TestResults];
                    const total = results.passed + results.failed;
                    const successRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
                    const Icon = config.icon;

                    return (
                        <Card key={key} className="relative">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Icon className={`h-5 w-5 mr-2 text-${config.color}-600`} />
                                        {config.name}
                                    </div>
                                    <Button
                                        onClick={() => runSingleTest(key as keyof TestResults)}
                                        disabled={results.running || globalTesting}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {results.running ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Play className="h-4 w-4" />
                                        )}
                                    </Button>
                                </CardTitle>
                                <CardDescription>{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Résultats</span>
                                        <Badge className={`${successRate === 100 ? "bg-green-100 text-green-800" :
                                                successRate >= 80 ? "bg-yellow-100 text-yellow-800" :
                                                    "bg-red-100 text-red-800"
                                            }`}>
                                            {results.passed}/{total} ({successRate}%)
                                        </Badge>
                                    </div>

                                    {results.tests.length > 0 && (
                                        <div className="space-y-2">
                                            {results.tests.map((test, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center">
                                                        {test.passed ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-600 mr-2" />
                                                        )}
                                                        <span className="truncate">{test.testName}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        {test.duration ? `${test.duration}ms` : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {results.running && (
                                        <div className="flex items-center justify-center py-4">
                                            <Clock className="h-4 w-4 animate-spin mr-2" />
                                            <span className="text-sm">Test en cours...</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}