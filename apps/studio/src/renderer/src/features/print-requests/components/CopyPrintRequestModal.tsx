import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { formatCustomerIdentityLabel } from "@fresh-prints/shared/utils/formatCustomerIdentityLabel";

export function CopyPrintRequestModal(props: {
  printRequest: PrintRequest;
  customers: Customer[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { destinationKind: "customer" | "internal"; destinationCustomerId?: string; destinationInternalBaseName?: string }) => void;
}) {
  const [destinationKind, setDestinationKind] = useState<"customer" | "internal">(props.printRequest.isInternal ? "internal" : "customer");
  const [customerId, setCustomerId] = useState(props.printRequest.customerId ?? "");
  const [internalBaseName, setInternalBaseName] = useState(props.printRequest.isInternal ? props.printRequest.internalBaseName ?? "internal" : props.printRequest.customerUsernameSnapshot ?? "internal");
  useEffect(() => {
    setDestinationKind(props.printRequest.isInternal ? "internal" : "customer");
    setCustomerId(props.printRequest.customerId ?? "");
    setInternalBaseName(props.printRequest.isInternal ? props.printRequest.internalBaseName ?? "internal" : props.printRequest.customerUsernameSnapshot ?? "internal");
  }, [props.printRequest]);
  const customerOptions = props.customers.filter((customer) => customer.username).map((customer) => ({ label: formatCustomerIdentityLabel({ currentUsername: customer.username, currentDisplayName: customer.displayName }), value: customer.id }));
  return <div className="modal-overlay modal-overlay-blur"><Modal aria-labelledby="copy-print-request-title" className="modal-panel modal-panel-md" role="dialog"><ModalHeader><div><p className="eyebrow">Copy request</p><h3 id="copy-print-request-title">Copy "{props.printRequest.name}"</h3></div><button aria-label="Close copy request" className="icon-button icon-button-md icon-button-ghost" disabled={props.isSubmitting} onClick={props.onClose} type="button"><X aria-hidden="true" size={18} /></button></ModalHeader><ModalBody><p>A new Working request will receive copied print items, sizes, quantities, and artwork intent. Allocations and production/completion history are not copied; add the new request to a show separately.</p><div className="print-requests-modal-grid"><Select label="Destination" name="copyDestinationKind" onChange={(event) => setDestinationKind(event.target.value as "customer" | "internal")} options={[{ label: "Customer Request", value: "customer" }, { label: "Internal Request", value: "internal" }]} value={destinationKind} />{destinationKind === "customer" ? <Select label="Customer" name="copyCustomerId" onChange={(event) => setCustomerId(event.target.value)} options={[{ label: "Choose a customer", value: "" }, ...customerOptions]} value={customerId} /> : <TextInput label="Internal base name" name="copyInternalBaseName" onChange={(event) => setInternalBaseName(event.target.value)} value={internalBaseName} />}</div>{props.error ? <ErrorState message={props.error} title="Copy failed" /> : null}</ModalBody><ModalFooter><Button disabled={props.isSubmitting} onClick={props.onClose} variant="secondary">Cancel</Button><Button disabled={props.isSubmitting || (destinationKind === "customer" && !customerId) || (destinationKind === "internal" && !internalBaseName.trim())} onClick={() => props.onSubmit({ destinationKind, ...(destinationKind === "customer" ? { destinationCustomerId: customerId } : { destinationInternalBaseName: internalBaseName }) })}>{props.isSubmitting ? "Copying…" : "Copy request"}</Button></ModalFooter></Modal></div>;
}
