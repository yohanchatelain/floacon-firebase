
"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, InfinityIcon, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Decimal from "decimal.js";

type Bit = '0' | '1';
type FloatType = 'Normal' | 'Denormal' | 'Infinity' | 'NaN' | 'Zero';

const PRESETS = [
    { name: 'binary16 (Half)', exp: 5, man: 10 },
    { name: 'bfloat16', exp: 8, man: 7 },
    { name: 'binary32 (Single)', exp: 8, man: 23 },
    { name: 'binary64 (Double)', exp: 11, man: 52 },
    { name: 'binary128 (Quad)', exp: 15, man: 112 },
];

const BitButton = ({ bit, index, onToggle, onSetRemaining }: { bit: Bit; index: number; onToggle: () => void; onSetRemaining: (value: Bit) => void }) => (
    <div className="flex flex-col items-center gap-1.5">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={bit === '1' ? 'default' : 'outline'}
                    size="icon"
                    className="h-7 w-7 shrink-0 font-mono text-xs"
                    onPointerDown={(e) => {
                        // For left-click without Alt, prevent the trigger's default action (opening the menu).
                        if (e.button === 0 && !e.altKey) {
                            e.preventDefault();
                        }
                    }}
                    onClick={(e) => {
                        // Since onPointerDown prevented the default, a normal click will now only run this.
                        if (!e.altKey) {
                            onToggle();
                        }
                        // For Alt+click, onPointerDown did nothing, so the trigger opens the menu as default.
                    }}
                    onContextMenu={(e) => {
                        // Prevent the default browser context menu.
                        e.preventDefault();
                    }}
                >
                    {bit}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onSetRemaining('1')}>Set remaining to 1s</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onSetRemaining('0')}>Set remaining to 0s</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs font-mono text-muted-foreground">{index}</span>
    </div>
);


const BitField = ({ bits, onToggle, label, onSetRemaining, startIndex = 0 }: { bits: string; onToggle: (index: number) => void; label: string; onSetRemaining: (startIndex: number, value: Bit) => void; startIndex?: number; }) => (
    <div>
        <Label className="text-sm font-medium">{label} ({bits.length} bits)</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
            {bits.split('').map((b, i) => (
                <BitButton key={i} bit={b as Bit} index={i} onToggle={() => onToggle(startIndex + i)} onSetRemaining={(val) => onSetRemaining(startIndex + i, val)} />
            ))}
        </div>
    </div>
);

const InfoEntry = ({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) => (
    <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{label}</span>
            {tooltip && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
        <code className="font-semibold text-right break-all">{value}</code>
    </div>
);

export function FloatConverter() {
    const [exponentBits, setExponentBits] = useState(8);
    const [mantissaBits, setMantissaBits] = useState(23);
    const [bits, setBits] = useState('0' + '0'.repeat(exponentBits) + '0'.repeat(mantissaBits));
    const [decimalInput, setDecimalInput] = useState("1.0");
    const { toast } = useToast();
    
    const resetBits = useCallback((expBits: number, manBits: number) => {
        const totalBits = 1 + expBits + manBits;
        setBits('0'.repeat(totalBits));
    }, []);

    const handleExponentChange = (value: number[]) => {
        setExponentBits(value[0]);
        resetBits(value[0], mantissaBits);
    };

    const handleMantissaChange = (value: number[]) => {
        setMantissaBits(value[0]);
        resetBits(exponentBits, value[0]);
    };

    const handlePresetChange = (name: string) => {
        const preset = PRESETS.find(p => p.name === name);
        if (preset) {
            setExponentBits(preset.exp);
            setMantissaBits(preset.man);
            resetBits(preset.exp, preset.man);
        }
    };

    const handleBitToggle = (index: number) => {
        setBits(prev => {
            const bit = prev[index] === '0' ? '1' : '0';
            return prev.substring(0, index) + bit + prev.substring(index + 1);
        });
    };

    const handleSetRemaining = (startIndex: number, value: Bit) => {
        setBits(prev => {
            const prefix = prev.substring(0, startIndex);
            const suffix = value.repeat(prev.length - startIndex);
            return prefix + suffix;
        });
    }

    const handleSetAllBits = (value: Bit) => {
        setBits(value.repeat(1 + exponentBits + mantissaBits));
    }

    const handleInvertBits = () => {
        setBits(prev => prev.split('').map(b => b === '0' ? '1' : '0').join(''));
    }

    const handleConvertToBits = () => {
        try {
            Decimal.set({ precision: Math.max(100, mantissaBits * 2) });
            const bias = (1 << (exponentBits - 1)) - 1;
            const minExp = 1 - bias;
            const maxExp = (1 << exponentBits) - 2 - bias;

            let value = decimalInput.trim().toLowerCase();
            let signBit = '0';

            if (value.startsWith('-')) {
                signBit = '1';
                value = value.substring(1);
            }
            if (value.startsWith('+')) {
                value = value.substring(1);
            }

            if (value === 'inf' || value === 'infinity') {
                setBits(signBit + '1'.repeat(exponentBits) + '0'.repeat(mantissaBits));
                return;
            }
            if (value === 'nan') {
                setBits(signBit + '1'.repeat(exponentBits) + '1'.repeat(mantissaBits));
                return;
            }

            const d = new Decimal(value);

            if (d.isZero()) {
                setBits(signBit + '0'.repeat(exponentBits + mantissaBits));
                return;
            }

            const e = d.log(2).floor().toNumber();

            let exponent;
            let mantissaBigInt;

            if (e < minExp) { // Denormal or underflow to zero
                exponent = 0;
                const denormFactor = new Decimal(2).pow(minExp - 1);
                const mantissaDecimal = d.div(denormFactor).times(new Decimal(2).pow(mantissaBits)).round();
                if (mantissaDecimal.isZero()) { // Underflow to zero
                    setBits(signBit + '0'.repeat(exponentBits + mantissaBits));
                    return;
                }
                mantissaBigInt = BigInt(mantissaDecimal.toFixed());
            } else if (e > maxExp) { // Overflow to infinity
                setBits(signBit + '1'.repeat(exponentBits) + '0'.repeat(mantissaBits));
                return;
            } else { // Normal
                exponent = e + bias;
                const f = d.div(new Decimal(2).pow(e)); // significand, 1 <= f < 2
                const mantissaDecimal = f.minus(1).times(new Decimal(2).pow(mantissaBits));
                mantissaBigInt = BigInt(mantissaDecimal.round().toFixed());
            }
            
            if (mantissaBigInt >= (1n << BigInt(mantissaBits))) {
                mantissaBigInt = 0n;
                exponent++;
                if (exponent >= (1 << exponentBits) - 1) { // overflow to infinity
                    setBits(signBit + '1'.repeat(exponentBits) + '0'.repeat(mantissaBits));
                    return;
                }
            }
            
            const exponentStr = exponent.toString(2).padStart(exponentBits, '0');
            const mantissaStr = mantissaBigInt.toString(2).padStart(mantissaBits, '0');

            setBits(signBit + exponentStr + mantissaStr);

        } catch (error) {
            toast({
                title: "Invalid Input",
                description: "Please enter a valid decimal number.",
                variant: "destructive"
            });
            console.error("Conversion error:", error);
        }
    };
    
    const signBit = bits[0] as Bit;
    const exponentStr = bits.substring(1, 1 + exponentBits);
    const mantissaStr = bits.substring(1 + exponentBits);

    const { value, type } = useMemo(() => {
        Decimal.set({ precision: 100 });
        const sign = parseInt(bits[0]);
        const bias = (1 << (exponentBits - 1)) - 1;

        const isExpOnes = !exponentStr.includes('0');
        const isExpZeros = !exponentStr.includes('1');
        const isMantissaZeros = !mantissaStr.includes('1');

        if (isExpOnes) {
            if (isMantissaZeros) return { value: (sign === 1 ? "-" : "") + "Infinity", type: "Infinity" as FloatType };
            return { value: "NaN", type: "NaN" as FloatType };
        }

        if (isExpZeros && isMantissaZeros) {
            return { value: "0", type: "Zero" as FloatType };
        }
        
        let exponent = parseInt(exponentStr, 2);
        let mantissa = BigInt('0b' + mantissaStr);
        let floatType: FloatType = 'Normal';

        let implicitBit: bigint;
        if (isExpZeros) { // Denormalized
            exponent = 1 - bias;
            implicitBit = 0n;
            floatType = 'Denormal';
        } else { // Normalized
            exponent = exponent - bias;
            implicitBit = 1n;
        }

        const significand = (implicitBit << BigInt(mantissaBits)) | mantissa;
        if (significand === 0n) return { value: "0", type: "Zero" };
        
        const finalExponent = exponent - mantissaBits;
        
        const decValue = new Decimal(significand.toString()).times(new Decimal(2).pow(finalExponent));
        const finalValue = sign === 1 ? decValue.negated() : decValue;
        
        const outputPrecision = mantissaBits > 53 ? 30 : 17;

        return { value: finalValue.toPrecision(outputPrecision), type: floatType };
    }, [bits, exponentBits, mantissaBits, exponentStr, mantissaStr]);

    const representations = useMemo(() => {
        const totalBits = 1 + exponentBits + mantissaBits;
        const hexPadding = Math.ceil(totalBits / 4);
        const binary = `${signBit} ${exponentStr} ${mantissaStr}`;
        const hex = `0x${BigInt('0b' + bits).toString(16).toUpperCase().padStart(hexPadding, '0')}`;

        return { binary, hex };
    }, [bits, exponentBits, mantissaBits, signBit, exponentStr, mantissaStr]);

    const formatInfo = useMemo(() => {
        Decimal.set({ precision: 100 });
        const bias = (1 << (exponentBits - 1)) - 1;
        const maxNormalExp = (1 << exponentBits) - 2 - bias;
        const minNormalExp = 1 - bias;
        const outputPrecision = mantissaBits > 53 ? 30 : 17;

        const maxNormal = new Decimal(2).minus(new Decimal(2).pow(-mantissaBits)).times(new Decimal(2).pow(maxNormalExp));
        const minNormal = new Decimal(2).pow(minNormalExp);
        const minDenormal = new Decimal(2).pow(1 - bias - mantissaBits);
        const epsilon = new Decimal(2).pow(-mantissaBits);

        return {
            bias,
            maxNormal: maxNormal.toPrecision(outputPrecision),
            minNormal: minNormal.toPrecision(outputPrecision),
            minDenormal: minDenormal.toPrecision(outputPrecision),
            epsilon: epsilon.toPrecision(outputPrecision),
        };
    }, [exponentBits, mantissaBits]);

    return (
        <TooltipProvider>
            <div className="container mx-auto max-w-4xl py-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Format Configuration</CardTitle>
                        <CardDescription>Define your custom floating-point format or select a preset.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        <Select onValueChange={handlePresetChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a preset format..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESETS.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="grid gap-4">
                            <Label>Exponent Bits: {exponentBits}</Label>
                            <Slider
                                min={2}
                                max={15}
                                step={1}
                                value={[exponentBits]}
                                onValueChange={handleExponentChange}
                            />
                        </div>
                        <div className="grid gap-4">
                            <Label>Mantissa Bits: {mantissaBits}</Label>
                            <Slider
                                min={2}
                                max={112}
                                step={1}
                                value={[mantissaBits]}
                                onValueChange={handleMantissaChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                         <CardTitle>Decimal to Float</CardTitle>
                         <CardDescription>Enter a decimal value to convert to the format above.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                value={decimalInput}
                                onChange={(e) => setDecimalInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConvertToBits()}
                                placeholder="e.g., 1.23e-10, -Infinity, NaN"
                            />
                            <Button onClick={handleConvertToBits}>Convert</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Interactive Bit Representation</CardTitle>
                                <CardDescription>Click to toggle a bit. Alt+Click for more options.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSetAllBits('0')}>Zeros</Button>
                                <Button variant="outline" size="sm" onClick={() => handleSetAllBits('1')}>Ones</Button>
                                <Button variant="outline" size="sm" onClick={handleInvertBits}>Invert</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <BitField bits={signBit} onToggle={handleBitToggle} label="Sign" onSetRemaining={handleSetRemaining} startIndex={0} />
                        <BitField bits={exponentStr} onToggle={handleBitToggle} label="Exponent" onSetRemaining={handleSetRemaining} startIndex={1} />
                        <BitField bits={mantissaStr} onToggle={handleBitToggle} label="Mantissa" onSetRemaining={handleSetRemaining} startIndex={1 + exponentBits} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {type === 'Infinity' || type === 'NaN' ? (
                            <Alert variant="destructive">
                                {type === 'Infinity' ? <InfinityIcon className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertTitle>{type}</AlertTitle>
                                <AlertDescription>
                                    {type === 'Infinity' ? `Represents ${bits[0] === '1' ? 'negative' : 'positive'} infinity.` : 'Not-a-Number, represents an invalid operation result.'}
                                </AlertDescription>
                            </Alert>
                        ) : (
                             <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Decimal Value</p>
                                    <p className="text-2xl font-bold font-mono break-all" data-testid="decimal-value">{value}</p>
                                    <p className="text-sm text-accent">{type} Value</p>
                                </div>
                                <Separator />
                                <div className="space-y-2 font-mono text-sm">
                                    <InfoEntry label="Binary" value={representations.binary} />
                                    <InfoEntry label="Hex" value={representations.hex} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Format Information</CardTitle>
                        <CardDescription>
                            Properties of the `FlexFloat-{1 + exponentBits + mantissaBits}` format.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <InfoEntry label="Total Bits" value={`${1 + exponentBits + mantissaBits}`} />
                         <InfoEntry label="Exponent Bias" value={`${formatInfo.bias} (0x${formatInfo.bias.toString(16).toUpperCase()})`} />
                         <Separator />
                         <InfoEntry label="Epsilon" tooltip="The smallest value that can be added to 1.0 to get a different number." value={formatInfo.epsilon} />
                         <InfoEntry label="Max Normal" tooltip="The largest finite number representable." value={formatInfo.maxNormal} />
                         <InfoEntry label="Min Normal" tooltip="The smallest positive number with a leading 1." value={formatInfo.minNormal} />
                         <InfoEntry label="Min Denormal" tooltip="The smallest positive number representable." value={formatInfo.minDenormal} />
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
