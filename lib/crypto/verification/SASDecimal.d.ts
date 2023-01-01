/**
 * Implementation of decimal encoding of SAS as per:
 * https://spec.matrix.org/v1.4/client-server-api/#sas-method-decimal
 * @param sasBytes - the five bytes generated by HKDF
 * @returns the derived three numbers between 1000 and 9191 inclusive
 */
export declare function generateDecimalSas(sasBytes: number[]): [number, number, number];
//# sourceMappingURL=SASDecimal.d.ts.map