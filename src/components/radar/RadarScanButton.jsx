import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Radar as RadarIcon } from "lucide-react";

/**
 * @param {Object} props
 * @param {'default'|'destructive'|'outline'|'secondary'|'ghost'|'link'} [props.variant]
 */
export default function RadarScanButton({ variant = "default" }) {
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const scan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("scanExternalRadar", {});
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
      } else {
        toast({
          title: `${data.created} signal${data.created > 1 ? "s" : ""} retenu${data.created > 1 ? "s" : ""}`,
          description: data.rejected > 0
            ? `${data.rejected} information${data.rejected > 1 ? "s" : ""} écartée${data.rejected > 1 ? "s" : ""} : hors secteur ou sans source consultable.`
            : "Chaque signal cite une source consultable.",
        });
        qc.invalidateQueries({ queryKey: ["signals"] });
      }
    } catch (e) {
      toast({ title: "Erreur : " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <Button onClick={scan} disabled={scanning} variant={variant}>
      {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RadarIcon className="mr-2 h-4 w-4" />}
      {scanning ? "Scan en cours…" : "Lancer un scan"}
    </Button>
  );
}