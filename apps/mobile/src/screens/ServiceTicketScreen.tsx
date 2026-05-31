// apps/mobile/src/screens/ServiceTicketScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { ServiceTicket } from '@a3-service/shared-schema';

/**
 * ServiceTicketScreen renders the details of a specific HVAC job.
 * The use of the shared ServiceTicket type ensures the UI matches the API contract.
 */
export const ServiceTicketScreen = () => {
  const [skippedValidation, setSkippedValidation] = useState(false);

  const currentJob: ServiceTicket = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    technicianId: "TECH-001",
    customerName: "Springfield General Hospital",
    location: { address: "100 Medical Plaza", zip: "62704" },
    equipment: { type: "AC", serialNumber: "AC-99283-X", brand: "Carrier" },
    workDescription: "Seasonal maintenance and filter replacement.",
    laborHours: 2.5,
    timestamp: new Date().toISOString(),
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Ticket: {currentJob.equipment.serialNumber}</Text>
      <Text>Client: {currentJob.customerName}</Text>
      <Text>Unit: {currentJob.equipment.brand} {currentJob.equipment.type}</Text>
      <Text>Logged Time: {new Date(currentJob.timestamp).toLocaleTimeString()}</Text>
      
      <View style={styles.toggleRow}>
        <Text>Skip Validation (Commissioning)</Text>
        <Switch
          value={skippedValidation}
          onValueChange={setSkippedValidation}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 15, borderRadius: 8, backgroundColor: '#f9f9f9', margin: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: '#ccc' }
});
