import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
const settings = [
  ["Mode", "Local single-user"],
  ["Calling method", "Manual mobile call"],
  ["AI provider", "Local deterministic templates"],
  ["Paid integrations", "Disabled"],
];
export default function Page() {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Settings</Typography>
      <Card>
        <CardContent>
          <List>
            {settings.map(([a, b]) => (
              <ListItem key={a} divider>
                <ListItemText primary={a} secondary={b} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
