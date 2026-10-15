//Network Routing and Packet Transmission using Shortest Path Algorithm
#include <iostream>
#include <queue>
#include <algorithm>
#include <climits>
#include <cctype>
using namespace std;

const int MAX = 26;

void shortestPath(int network[MAX][MAX],int n, int source, int destination)
{
    int distance[MAX];
    int previous[MAX];
    bool visited[MAX] = {false};

    for (int i = 0; i < n; i++)
    {
        distance[i] = INT_MAX;
        previous[i] = -1;
    }

    priority_queue<pair<int, int>,vector<pair<int, int>>,greater<pair<int, int>>> pq;

    distance[source] = 0;
    pq.push({0, source});

    while (!pq.empty())
    {
        int cost = pq.top().first;
        int current = pq.top().second;
        pq.pop();

        if (visited[current])
            continue;

        visited[current] = true;

        for (int nextRouter = 0; nextRouter < n; nextRouter++)
        {
            if (network[current][nextRouter] != -1)
            {
                int linkCost = network[current][nextRouter];

                if (distance[current] != INT_MAX &&distance[current] + linkCost < distance[nextRouter])
                {
                    distance[nextRouter] =distance[current] + linkCost;

                    previous[nextRouter] = current;

                    pq.push({distance[nextRouter], nextRouter});
                }
            }
        }
    }

    if (distance[destination] == INT_MAX)
    {
        cout << "\nNo route available between these routers!\n";
        return;
    }

    int path[MAX];
    int pathSize = 0;

    for(int current = destination;current != -1;current = previous[current])
    {
        path[pathSize++] = current;
    }

    reverse(path, path + pathSize);

    cout << "\n========== ROUTING RESULT ==========\n";
    cout << "Shortest Path: ";

    for (int i = 0; i < pathSize; i++)
    {
        cout << char('A' + path[i]);

        if (i != pathSize - 1)
        cout << " -> ";
    }

    cout << "\nTotal Routing Cost: "<< distance[destination] << endl;

    cout << "\n========== PACKET TRANSMISSION ==========\n";

    for (int i = 0; i < pathSize; i++)
    {
        cout << "Packet reached Router "<< char('A' + path[i]) << endl;
    }

    cout << "Packet delivered successfully!\n";
}

int main()
{
    int n, edges;

    cout << "========================================\n";
    cout << " NETWORK ROUTING AND PACKET TRANSMISSION\n";
    cout << "========================================\n";

    cout << "\nEnter number of routers (1-26): ";
    cin >> n;

    if (cin.fail() || n < 1 || n > 26)
    {
        cout << "Invalid number of routers!\n";
        return 0;
    }

    int network[MAX][MAX];

    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
        {
            network[i][j] = -1;
        }
    }

    cout << "Enter number of connections: ";
    cin >> edges;

    if (cin.fail() || edges < 0 ||edges > n * (n - 1) / 2)
    {
        cout << "Invalid number of connections!\n";
        return 0;
    }

    cout << "\nRouter names: A to "<< char('A' + n - 1) << endl;

    cout << "\nEnter connections and their costs:\n";
    cout << "Example: A B 4 means A-B cost is 4\n\n";

    for (int i = 0; i < edges; i++)
    {
        char u, v;
        int cost;

        cout << "Connection " << i + 1 << ": ";
        cin >> u >> v >> cost;

        u = toupper(static_cast<unsigned char>(u));
        v = toupper(static_cast<unsigned char>(v));

        if (!cin || u < 'A' || u >= 'A' + n ||v < 'A' || v >= 'A' + n ||u == v || cost < 0)
        {
            cout << "Invalid connection or cost!\n";
            return 0;
        }

        int a = u - 'A';
        int b = v - 'A';

        network[a][b] = cost;
        network[b][a] = cost;
    }

    char source, destination;

    cout << "\nEnter source router: ";
    cin >> source;

    cout << "Enter destination router: ";
    cin >> destination;

    source = toupper(static_cast<unsigned char>(source));
    destination = toupper(static_cast<unsigned char>(destination));

    if (!cin || source < 'A' || source >= 'A' + n ||destination < 'A' || destination >= 'A' + n)
    {
        cout << "Invalid source or destination router!\n";
        return 0;
    }

    shortestPath(network, n, source - 'A',destination - 'A');

    return 0;
}
